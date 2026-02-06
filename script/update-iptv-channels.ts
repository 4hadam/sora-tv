import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

interface Channel {
  name: string
  url: string
  logo?: string
  category?: string
  countryName?: string
}

interface ParsedChannel {
  tvg_id?: string
  tvg_name?: string
  tvg_logo?: string
  group_title?: string
  url: string
  name: string
}

// قائمة الدول ورموزها
const countryCodeMap: Record<string, string> = {
  'MA': 'Morocco',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'EG': 'Egypt',
  'DZ': 'Algeria',
  'TN': 'Tunisia',
  'JO': 'Jordan',
  'PS': 'Palestine',
  'LB': 'Lebanon',
  'SY': 'Syria',
  'IQ': 'Iraq',
  'KW': 'Kuwait',
  'QA': 'Qatar',
  'BH': 'Bahrain',
  'OM': 'Oman',
  'YE': 'Yemen',
  'US': 'United States',
  'GB': 'United Kingdom',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'ES': 'Spain',
  'TR': 'Turkey',
  'CN': 'China',
  'JP': 'Japan',
  'IN': 'India',
  'BR': 'Brazil',
}

async function testChannelUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 5,
    })
    return response.status >= 200 && response.status < 400
  } catch {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 5,
      })
      return response.status >= 200 && response.status < 400
    } catch {
      return false
    }
  }
}

function parseM3ULine(line: string): { info: ParsedChannel; url: string } | null {
  const infoMatch = line.match(/^#EXTINF:-1\s+(.*)/);
  if (!infoMatch) return null;

  const info = infoMatch[1];
  const parsed: ParsedChannel = {
    url: '',
    name: '',
  };

  // استخراج البيانات
  const tvgIdMatch = info.match(/tvg-id="([^"]+)"/);
  if (tvgIdMatch) parsed.tvg_id = tvgIdMatch[1];

  const tvgNameMatch = info.match(/tvg-name="([^"]+)"/);
  if (tvgNameMatch) parsed.tvg_name = tvgNameMatch[1];

  const tvgLogoMatch = info.match(/tvg-logo="([^"]+)"/);
  if (tvgLogoMatch) parsed.tvg_logo = tvgLogoMatch[1];

  const groupMatch = info.match(/group-title="([^"]+)"/);
  if (groupMatch) parsed.group_title = groupMatch[1];

  // اسم القناة (آخر جزء بعد الفاصلة)
  const nameMatch = info.match(/,(.+)$/);
  if (nameMatch) parsed.name = nameMatch[1].trim();

  return { info: parsed, url: '' };
}

async function fetchAndProcessIPTVChannels(): Promise<Record<string, Channel[]>> {
  console.log('🔄 جاري جلب قنوات IPTV من iptv-org/iptv...');

  const channelsByCountry: Record<string, Channel[]> = {};

  try {
    // جلب قائمة الملفات من iptv-org
    const response = await axios.get(
      'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u',
      { timeout: 30000 }
    );

    const lines = response.data.split('\n');
    let currentChannelInfo: ParsedChannel | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF')) {
        const parsed = parseM3ULine(line);
        if (parsed) {
          currentChannelInfo = parsed.info;
        }
      } else if (line && !line.startsWith('#') && currentChannelInfo) {
        const url = line;

        // اختبار الرابط
        console.log(`✓ اختبار: ${currentChannelInfo.name}...`);
        const isUrlValid = await testChannelUrl(url);

        if (isUrlValid) {
          // استخراج رمز الدولة من tvg-id أو group-title
          let countryCode = '';
          let countryName = '';

          if (currentChannelInfo.tvg_id) {
            const codeMatch = currentChannelInfo.tvg_id.match(/([A-Z]{2})/);
            if (codeMatch) {
              countryCode = codeMatch[1];
              countryName = countryCodeMap[countryCode] || countryCode;
            }
          }

          if (!countryName && currentChannelInfo.group_title) {
            // محاولة استخراج اسم الدولة من group-title
            const groupParts = currentChannelInfo.group_title.split('|');
            if (groupParts.length > 0) {
              countryName = groupParts[0].trim();
            }
          }

          if (!countryName) {
            countryName = 'Uncategorized';
          }

          const channel: Channel = {
            name: currentChannelInfo.name,
            url: url,
            logo: currentChannelInfo.tvg_logo,
            category: currentChannelInfo.group_title || 'General',
            countryName: countryName,
          };

          if (!channelsByCountry[countryName]) {
            channelsByCountry[countryName] = [];
          }

          channelsByCountry[countryName].push(channel);
          console.log(`✅ تمت إضافة: ${currentChannelInfo.name} (${countryName})`);
        } else {
          console.log(`❌ الرابط معطل: ${currentChannelInfo.name}`);
        }

        currentChannelInfo = null;
      }
    }
  } catch (error) {
    console.error('❌ خطأ في جلب القنوات:', error);
  }

  return channelsByCountry;
}

function formatChannelObject(channel: Channel): string {
  return JSON.stringify(channel);
}

async function updateIPTVChannelsFile(newChannels: Record<string, Channel[]>) {
  const filePath = path.join(process.cwd(), 'shared', 'iptv-channels.ts');

  try {
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    // إنشاء كود TypeScript للقنوات الجديدة
    let newChannelCode = '';
    for (const [country, channels] of Object.entries(newChannels)) {
      newChannelCode += `\n  "${country}": [\n`;
      newChannelCode += channels
        .slice(0, 10) // الحد الأقصى 10 قنوات لكل دولة
        .map(
          (ch) => `    { "name": "${ch.name}", "url": "${ch.url}", "category": "${ch.category || 'General'}", "logo": "${ch.logo || ''}", "countryName": "${ch.countryName}" }`
        )
        .join(',\n');
      newChannelCode += '\n  ],';
    }

    // البحث عن نقطة الإدراج (قبل "South Africa")
    const insertPoint = fileContent.indexOf('"South Africa":');
    if (insertPoint === -1) {
      console.error('❌ لم يتمكن من العثور على نقطة الإدراج');
      return;
    }

    // الحفاظ على القنوات القديمة وإضافة الجديدة
    const updatedContent =
      fileContent.substring(0, insertPoint) +
      newChannelCode +
      '\n\n  ' +
      fileContent.substring(insertPoint);

    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✅ تم تحديث ${filePath} بنجاح`);
  } catch (error) {
    console.error('❌ خطأ في تحديث الملف:', error);
  }
}

async function main() {
  console.log('🚀 بدء تحديث قنوات IPTV...\n');
  const channels = await fetchAndProcessIPTVChannels();
  console.log(`\n📊 تم جمع ${Object.keys(channels).length} دول\n`);
  
  // اختياري: تحديث الملف
  // await updateIPTVChannelsFile(channels);
  
  console.log('✅ اكتمل!\n');
}

main().catch(console.error);
