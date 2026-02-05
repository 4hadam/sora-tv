import { useState, useEffect } from "react"
import { ChevronLeft } from "lucide-react"

import { getChannelsByCountry, getChannelsByCategory } from "@shared/iptv-channels"
import { COUNTRY_CODE_MAP } from "@shared/country-codes"

interface IPTVChannel {
  name: string
  url?: string
  language?: any
  lang?: any
  platform?: string
  source?: string
  streams?: any[]
  sources?: any[]
  description?: string
  category?: string
  countryName?: string
  [key: string]: any
}

interface CountrySidebarProps {
  selectedCountry: string | null
  onSelectCountry: (country: string | null) => void
  onSelectChannel: (channel: string) => void
  onClose?: () => void
  externalSearch?: string
  currentTime: string
  isMobile?: boolean
  activeCategory: string | null
}

/** خريطة لغات افتراضية للدولة كمحفّظ (fallback) */
export const COUNTRY_LANG_MAP: Record<string, string> = {
  "Afghanistan": "fa",
  "Albania": "sq",
  "Algeria": "ar",
  "Andorra": "ca",
  "Angola": "pt",
  "Antigua and Barbuda": "en",
  "Argentina": "es",
  "Armenia": "hy",
  "Australia": "en",
  "Austria": "de",
  "Azerbaijan": "az",
  "Bahamas": "en",
  "Bahrain": "ar",
  "Bangladesh": "bn",
  "Barbados": "en",
  "Belarus": "be",
  "Belgium": "fr",
  "Belize": "en",
  "Benin": "fr",
  "Bhutan": "dz",
  "Bolivia": "es",
  "Bosnia and Herzegovina": "bs",
  "Botswana": "en",
  "Brazil": "pt",
  "Brunei": "ms",
  "Bulgaria": "bg",
  "Burkina Faso": "fr",
  "Burundi": "fr",
  "Cabo Verde": "pt",
  "Cambodia": "km",
  "Cameroon": "fr",
  "Canada": "en",
  "Central African Republic": "fr",
  "Chad": "fr",
  "Chile": "es",
  "China": "zh",
  "Colombia": "es",
  "Comoros": "fr",
  "Congo (Brazzaville)": "fr",
  "Congo (Kinshasa)": "fr",
  "Costa Rica": "es",
  "Côte d'Ivoire": "fr",
  "Cote d'Ivoire": "fr",
  "Croatia": "hr",
  "Cuba": "es",
  "Cyprus": "el",
  "Czech Republic": "cs",
  "Denmark": "da",
  "Djibouti": "fr",
  "Dominica": "en",
  "Dominican Republic": "es",
  "Ecuador": "es",
  "Egypt": "ar",
  "El Salvador": "es",
  "Equatorial Guinea": "es",
  "Eritrea": "ti",
  "Estonia": "et",
  "Eswatini": "en",
  "Ethiopia": "am",
  "Fiji": "en",
  "Finland": "fi",
  "France": "fr",
  "Gabon": "fr",
  "Gambia": "en",
  "Georgia": "ka",
  "Germany": "de",
  "Ghana": "en",
  "Greece": "el",
  "Grenada": "en",
  "Guatemala": "es",
  "Guinea": "fr",
  "Guinea-Bissau": "pt",
  "Guyana": "en",
  "Haiti": "fr",
  "Honduras": "es",
  "Hungary": "hu",
  "Iceland": "is",
  "India": "hi",
  "Indonesia": "id",
  "Iran": "fa",
  "Iraq": "ar",
  "Ireland": "en",
  "Israel": "he",
  "Italy": "it",
  "Jamaica": "en",
  "Japan": "ja",
  "Jordan": "ar",
  "Kazakhstan": "kk",
  "Kenya": "sw",
  "Kiribati": "en",
  "Kuwait": "ar",
  "Kyrgyzstan": "ky",
  "Laos": "lo",
  "Latvia": "lv",
  "Lebanon": "ar",
  "Lesotho": "en",
  "Liberia": "en",
  "Libya": "ar",
  "Liechtenstein": "de",
  "Lithuania": "lt",
  "Luxembourg": "fr",
  "Madagascar": "fr",
  "Malawi": "en",
  "Malaysia": "ms",
  "Maldives": "dv",
  "Mali": "fr",
  "Malta": "en",
  "Marshall Islands": "en",
  "Mauritania": "ar",
  "Mauritius": "en",
  "Mexico": "es",
  "Micronesia": "en",
  "Moldova": "ro",
  "Monaco": "fr",
  "Mongolia": "mn",
  "Montenegro": "sr",
  "Morocco": "ar",
  "Mozambique": "pt",
  "Myanmar": "my",
  "Namibia": "en",
  "Nauru": "en",
  "Nepal": "ne",
  "Netherlands": "nl",
  "New Zealand": "en",
  "Nicaragua": "es",
  "Niger": "fr",
  "Nigeria": "en",
  "North Korea": "ko",
  "North Macedonia": "mk",
  "Norway": "no",
  "Oman": "ar",
  "Pakistan": "ur",
  "Palau": "en",
  "Panama": "es",
  "Papua New Guinea": "en",
  "Paraguay": "es",
  "Peru": "es",
  "Philippines": "en",
  "Poland": "pl",
  "Portugal": "pt",
  "Qatar": "ar",
  "Romania": "ro",
  "Russia": "ru",
  "Rwanda": "rw",
  "Saint Kitts and Nevis": "en",
  "Saint Lucia": "en",
  "Saint Vincent and the Grenadines": "en",
  "Samoa": "sm",
  "San Marino": "it",
  "Sao Tome and Principe": "pt",
  "Saudi Arabia": "ar",
  "Senegal": "fr",
  "Serbia": "sr",
  "Seychelles": "en",
  "Sierra Leone": "en",
  "Singapore": "en",
  "Slovakia": "sk",
  "Slovenia": "sl",
  "Solomon Islands": "en",
  "Somalia": "so",
  "South Africa": "en",
  "South Korea": "ko",
  "South Sudan": "en",
  "Spain": "es",
  "Sri Lanka": "si",
  "Sudan": "ar",
  "Suriname": "nl",
  "Sweden": "sv",
  "Switzerland": "de",
  "Syria": "ar",
  "Taiwan": "zh",
  "Tajikistan": "tg",
  "Tanzania": "sw",
  "Thailand": "th",
  "Timor-Leste": "pt",
  "Togo": "fr",
  "Tonga": "en",
  "Trinidad and Tobago": "en",
  "Tunisia": "ar",
  "Turkey": "tr",
  "Turkmenistan": "tk",
  "Tuvalu": "en",
  "Uganda": "en",
  "Ukraine": "uk",
  "United Arab Emirates": "ar",
  "United Kingdom": "en",
  "United States of America": "en",
  "United States": "en",
  "Uruguay": "es",
  "Uzbekistan": "uz",
  "Vanuatu": "en",
  "Vatican City": "it",
  "Venezuela": "es",
  "Vietnam": "vi",
  "Yemen": "ar",
  "Zambia": "en",
  "Zimbabwe": "en"
}

// --------------------- كشف يوتيوب ---------------------
function isYouTubeUrlString(url?: string): boolean {
  if (!url) return false
  try {
    const s = url.toString().toLowerCase()
    return s.includes("youtube.com") || s.includes("youtu.be") || s.includes("youtube-nocookie.com")
  } catch {
    return false
  }
}

function isYouTubeChannel(channel: any): boolean {
  if (!channel) return false

  if (typeof channel.url === "string" && isYouTubeUrlString(channel.url)) return true

  const pf = (channel.platform || channel.source || channel.meta?.source || channel.provider || "").toString().toLowerCase()
  if (pf.includes("youtube")) return true

  const otherKeys = ["stream", "streamUrl", "embed", "href", "uri", "playlist", "playUrl"]
  for (const k of otherKeys) {
    const v = channel[k]
    if (!v) continue
    if (typeof v === "string" && isYouTubeUrlString(v)) return true
  }

  const arraysToCheck = ["streams", "sources", "urls", "playlists"]
  for (const key of arraysToCheck) {
    const v = channel[key]
    if (!v) continue
    if (Array.isArray(v)) {
      for (const item of v) {
        if (!item) continue
        if (typeof item === "string" && isYouTubeUrlString(item)) return true
        if (typeof item === "object" && (item.url || item.src || item.href)) {
          if (isYouTubeUrlString(item.url || item.src || item.href)) return true
        }
      }
    }
  }

  const textFields = [channel.provider, channel.display, channel.type, channel.kind]
  for (const f of textFields) {
    if (!f) continue
    if (f.toString().toLowerCase().includes("youtube")) return true
  }

  return false
}

// --------------------- كشف لغة القناة ---------------------
function detectChannelLang(channel: any, countryFallback?: string | null): string | null {
  if (!channel) return null

  /** رموز اللغات القياسية (ISO 639-1) */
  const validLangs = new Set([
    "ar","en","fr","es","pt","tr","ur","he","de","ru","zh","it","nl","pl","sv","no","fi","da","hi","bn","sw",
    "am","km","ms","vi","ja","ko","ro","az","cs","el","sr","hr","bg","hu","sk","sl","mk","lt","lv","et","fa"
  ])

  // 1️⃣ فحص الحقول المباشرة الشائعة
  const candidates = [
    channel.language,
    channel.lang,
    channel.lang_code,
    channel.language_code,
    channel.languageCode,
    channel.locale,
    channel.iso,
    channel.iso_lang,
    channel.audioLang,
    channel.meta?.language,
    channel.metadata?.language,
    channel.props?.language,
  ]

  for (const c of candidates) {
    if (!c) continue
    const val = String(Array.isArray(c) ? c[0] : c).toLowerCase().trim()
    if (validLangs.has(val)) return val
    if (val.startsWith("ara")) return "ar"
    if (val.startsWith("eng")) return "en"
    if (val.startsWith("fra") || val.includes("franc")) return "fr"
    if (val.startsWith("spa") || val.includes("espa")) return "es"
    if (val.startsWith("por") || val.includes("portu")) return "pt"
    if (val.includes("turk")) return "tr"
    if (val.includes("urdu")) return "ur"
    if (val.includes("heb") || val.includes("عبريt")) return "he"
    if (val.includes("pers") || val.includes("fars")) return "fa"
  }

  // 2️⃣ فحص النصوص الداخلية لكن بدون كلمات مثل TV / HD / Radio / Music
  const text = JSON.stringify(channel).toLowerCase()
  const blacklist = ["tv","hd","fm","radio","video","music","channel","news","live","feed"]
  const safeText = blacklist.reduce((acc, w) => acc.replaceAll(w, ""), text)

  // 3️⃣ الكشف عبر حروف أو كلمات دلالية
  if (safeText.match(/[\u0600-\u06FF]/)) return "ar" // نص عربي
  if (safeText.includes("arab") || safeText.includes("العرب")) return "ar"
  if (safeText.includes("english")) return "en"
  if (safeText.includes("franc") || safeText.includes("français")) return "fr"
  if (safeText.includes("espa")) return "es"
  if (safeText.includes("portu")) return "pt"
  if (safeText.includes("turk")) return "tr"
  if (safeText.includes("urdu")) return "ur"
  if (safeText.includes("hebr") || safeText.includes("عبريt")) return "he"
  if (safeText.includes("pers") || safeText.includes("fars")) return "fa"
  if (safeText.includes("chin") || safeText.includes("mandar")) return "zh"
  if (safeText.includes("russ")) return "ru"
  if (safeText.includes("deut") || safeText.includes("german")) return "de"
  if (safeText.includes("hindi")) return "hi"
  if (safeText.includes("beng")) return "bn"
  if (safeText.includes("viet")) return "vi"
  if (safeText.includes("thai")) return "th"
  if (safeText.includes("japa")) return "ja"
  if (safeText.includes("kore")) return "ko"

  // 4️⃣ fallback إلى لغة الدولة
  if (countryFallback) {
    const fallback = COUNTRY_LANG_MAP[countryFallback]
    if (fallback && validLangs.has(fallback)) return fallback
  }

  return null
}

// --------------------- المكون الرئيسي ---------------------
const COUNTRIES = Object.keys(COUNTRY_CODE_MAP)

export default function CountrySidebar({
  selectedCountry,
  onSelectCountry,
  onSelectChannel,
  onClose,
  externalSearch = "",
  currentTime,
  isMobile = false,
  activeCategory,
}: CountrySidebarProps) {
  const [channels, setChannels] = useState<IPTVChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => setSearchQuery(externalSearch), [externalSearch])

  // المنطق الجديد: تحديد ما يجب عرضه
  const isCategoryBrowsing = activeCategory !== "all-channels" && activeCategory !== "about" && !activeCategory?.startsWith("faq") && !activeCategory?.startsWith("privacy") && !activeCategory?.startsWith("feedback")
  const shouldShowChannels = !!selectedCountry || isCategoryBrowsing

  // تحديث useEffect بالكامل
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true)
      setChannels([])

      try {
        let data: IPTVChannel[] = []

        // --- المنطق الجديد ---
        if (selectedCountry) {
          // (أ) المستخدم ضغط على دولة: جلب القنوات لهذه الدولة (مفلترة حسب الفئة)
          data = await getChannelsByCountry(selectedCountry, activeCategory)
        } else if (isCategoryBrowsing) {
          // (ب) المستخدم ضغط على فئة: جلب كل القنوات من كل الدول التي تطابق هذه الفئة
          data = await getChannelsByCategory(activeCategory)
        }

        setChannels(data)
      } catch (err) {
        // Error fetching channels
        setChannels([])
      } finally {
        setLoading(false)
      }
    }

    // (قم بالجلب فقط إذا كنا سنعرض قنوات)
    if (shouldShowChannels) {
      fetchChannels()
    } else {
      setChannels([]) // تنظيف القائمة عند العودة لقائمة الدول
      setLoading(false)
    }
  }, [selectedCountry, activeCategory, shouldShowChannels])

  const handleSelectCountry = (country: string) => onSelectCountry(country)

  // تعديل دالة "الرجوع"
  const handleBack = () => {
    // دائماً ارجع إلى قائمة الدول (سواء كنت في دولة أو في قائمة فئة عامة)
    onSelectCountry(null)
    // (ملاحظة: page.tsx يجب أن يعيد activeCategory إلى "all-channels")
  }

  const handleSelectChannel = (channel: IPTVChannel) => {
    onSelectChannel(channel.name)
    if (!isMobile) {
      onClose?.()
    }
  }

  const getCode = (countryName: string) =>
    COUNTRY_CODE_MAP[countryName as keyof typeof COUNTRY_CODE_MAP]?.toLowerCase() || "xx"

  // تحديد العنوان الصحيح
  let title = "Select a Country"
  if (selectedCountry) {
    title = selectedCountry
  } else if (shouldShowChannels && activeCategory) {
    // (تحويل "music" إلى "Music" أو "top-news" إلى "Top News")
    title = activeCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // small yt svg (gray) kept
  const YouTubeSVG = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* مستطيل أحمر بسيط بدون أي إطار */}
      <rect x="2" y="6" width="20" height="12" rx="3" fill="#FF0000" />

      {/* مثلث التشغيل الأبيض */}
      <path d="M10 15V9l6 3-6 3z" fill="#FFFFFF" />
    </svg>
  )

  return (
    <aside className="w-full h-full text-white flex flex-col bg-[#0B0D11]">
      <div className="border-b border-white/10" />

      {/* --- الهيدر الخاص بالقائمة --- */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {/* إظهار زر الرجوع إذا كنا نعرض قنوات (إما لدولة أو لفئة) */}
          {shouldShowChannels && (
            <button
              onClick={handleBack}
              className="p-1.5 rounded-full bg-black text-white transition-transform duration-200"
              aria-label="Return to list"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-white leading-tight">
            {title}
          </h2>
        </div>
        <p className="text-sm text-slate-400">{currentTime}</p>
      </div>

      <div className="border-b border-white/10" />

      {/* --- المحتوى الرئيسي (دول أو قنوات) --- */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* المنطق الجديد للعرض */}
        {!shouldShowChannels ? (
          // --- (أ) عرض قائمة الدول ---
          // (هذا يحدث فقط إذا selectedCountry = null و activeCategory = "all-channels")
          <ul>
            {COUNTRIES.map((country) => (
              <li key={country} className="sidebar-entry country-item" style={{ height: 64 }}>
                <button
                  onClick={() => handleSelectCountry(country)}
                  className="flex items-center gap-2 w-full h-full px-4 hover:bg-white/5 transition-colors text-left"
                >
                  <img
                    src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/${getCode(country)}.svg`}
                    alt={`${country} flag`}
                    className="w-5 h-4 rounded-sm object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                  <span className="text-[15px] font-medium text-white truncate">{country}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          // --- (ب) عرض قائمة القنوات ---
          <>
            {loading ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">Loading channels...</div>
            ) : channels.length > 0 ? (
              <ul>
                {channels.map((channel, index) => {
                  const isYT = isYouTubeChannel(channel)
                  const lang = detectChannelLang(channel, selectedCountry || channel.countryName || undefined) || ""
                  
                  // تحديد العلم الصحيح
                  const flagCode = selectedCountry ? getCode(selectedCountry) : getCode(channel.countryName || "")

                  return (
                    <li key={`${channel.name}-${index}`} className="sidebar-entry channel-item" style={{ height: 64 }}>
                      <button
                        onClick={() => handleSelectChannel(channel)}
                        className="flex items-center justify-between w-full h-full px-5 hover:bg-white/5 transition-colors text-left"
                        title={channel.name}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/${flagCode}.svg`}
                            alt="flag"
                            className="w-6 h-4 rounded-sm object-cover"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                          />
                          <span className="text-[15px] text-white truncate font-normal">{channel.name}</span>
                        </div>

                        <div className="flex items-center gap-4 ml-3 min-w-[92px] justify-end">
                          {isYT ? (
                            <span title="YouTube stream">{YouTubeSVG}</span>
                          ) : (
                            <span style={{ width: 24, display: "inline-block" }} />
                          )}
                          <span className="text-sm text-slate-400 font-semibold tracking-wide" aria-hidden={lang ? "false" : "true"}>
                            {lang}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              // (رسالة ديناميكية عند عدم وجود قنوات)
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                No channels found for "{activeCategory}" {selectedCountry ? `in ${selectedCountry}` : ''}.
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}