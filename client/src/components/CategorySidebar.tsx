"use client"

import type { MouseEvent } from "react"
import { useLocation } from "wouter"

// 1. Props
interface CategorySidebarProps {
  activeCategory: string | null
  onCategorySelect: (category: string) => void
  onClose: () => void
}

export default function CategorySidebar({
  activeCategory,
  onCategorySelect,
  onClose,
}: CategorySidebarProps) {

  const [, navigate] = useLocation()

  // 2. Click Handler
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget.dataset.target
    if (!target) return
    if (target === "faq") { navigate("/faq"); return }
    if (target === "privacy-policy") { navigate("/privacy"); return }
    onCategorySelect(target)
  }

  // 3. Tailwind Class Function
  const getButtonClass = (target: string) => {
    // Base classes
    const baseClass = "flex items-center w-full gap-4 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
    // Active state classes
    const isActive = activeCategory === target ? "bg-gray-800 text-white font-semibold" : ""
    return `${baseClass} ${isActive}`.trim()
  }

  // Icon classes
  const iconClass = "w-6 h-6 flex items-center justify-center flex-shrink-0"

  return (
    // Navigation drawer content
    <nav className="w-full h-full flex flex-col p-4 text-white overflow-y-auto custom-scroll">

      {/* === Top Section === */}
      <div className="flex flex-col">
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              data-target="about"
              className={getButtonClass("about")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"></path><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"></path></svg>
              </span>
              <span>About</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              data-target="favorite-channels"
              className={getButtonClass("favorite-channels")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M19.65 9.04l-4.84-.42-1.89-4.45c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18-1.1 4.72c-.2.86.73 1.54 1.49 1.08l4.15-2.5 4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.73 3.67-3.18c.67-.58.32-1.68-.56-1.75zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" fill="currentColor"></path></svg>
              </span>
              <span>Favorites</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              data-target="random-channel"
              className={getButtonClass("random-channel")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24"><path d="M23.214 12.543l-2.352-10.618c-0.155-0.677-0.752-1.175-1.466-1.175-0.114 0-0.226 0.013-0.333 0.037l0.010-0.002-10.618 2.352c-0.677 0.154-1.176 0.751-1.176 1.464 0 0.115 0.013 0.227 0.037 0.334l-0.002-0.010 0.985 4.449h-6.051c-0.828 0.001-1.499 0.672-1.5 1.5v10.875c0.001 0.828 0.672 1.499 1.5 1.5h10.875c0.828-0.001 1.499-0.672 1.5-1.5v-5.768l7.449-1.65c0.677-0.155 1.175-0.752 1.175-1.466 0-0.114-0.013-0.226-0.037-0.333l0.002 0.010zM13.125 21.75h-10.875v-10.875h6.383l1.034 4.669c0.154 0.676 0.749 1.174 1.461 1.176h0c0.116-0 0.229-0.013 0.338-0.038l-0.010 0.002 1.669-0.37 0 5.435zM21.75 12.868l-10.618 2.352-2.352-10.618 10.618-2.352 2.353 10.617z" fill="currentColor"></path><path d="M3.75 12.375h1.875v1.875h-1.875v-1.875z" fill="currentColor"></path><path d="M3.75 18.375h1.875v1.875h-1.875v-1.875z" fill="currentColor"></path><path d="M9.75 18.375h1.875v1.875h-1.875v-1.875z" fill="currentColor"></path><path d="M6.75 15.375h1.875v1.875h-1.875v-1.875z" fill="currentColor"></path><path d="M10.569 5.742l1.831-0.405 0.405 1.831-1.831 0.405-0.405-1.831z" fill="currentColor"></path><path d="M17.725 10.303l1.831-0.405 0.405 1.831-1.831 0.405-0.405-1.831z" fill="currentColor"></path><path d="M14.147 8.022l1.831-0.405 0.405 1.831-1.831 0.405-0.405-1.831z" fill="currentColor"></path></svg>
              </span>
              <span>Random Channel</span>
            </button>
          </li>
        </ul>
        {/* Divider */}
        <hr className="my-4 border-gray-700" />
      </div>

      {/* === Middle Section (Explore) === */}
      <div className="flex flex-col flex-1">
        <ul className="space-y-1">
          {/* Section title */}
          <li className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Explore
          </li>

          {/* --- Start of category list --- */}
          <li><button type="button" data-target="all-channels" className={getButtonClass("all-channels")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M10.5 17.15l3.98-2.28c.67-.38.67-1.35 0-1.74l-3.98-2.28c-.67-.38-1.5.11-1.5.87v4.55c0 .77.83 1.26 1.5.88zM21 6h-7.59l2.94-2.94c.2-.2.2-.51 0-.71s-.51-.2-.71 0L12 5.99 8.36 2.35c-.2-.2-.51-.2-.71 0s-.2.51 0 .71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm-1 14H4c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1z" fill="currentColor"></path></svg> </span><span>All Channels</span></button></li>
          <li><button type="button" data-target="top-news" className={getButtonClass("top-news")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><path d="M22,3l-1.67,1.67L18.67,3L17,4.67L15.33,3l-1.66,1.67L12,3l-1.67,1.67L8.67,3L7,4.67L5.33,3L3.67,4.67L2,3v16 c0,1.1,0.9,2,2,2l16,0c1.1,0,2-0.9,2-2V3z M11,19H4v-6h7V19z M20,19h-7v-2h7V19z M20,15h-7v-2h7V15z M20,11H4V8h16V11z" fill="currentColor"></path></g></svg> </span><span>Top News</span></button></li>
          <li><button type="button" data-target="news" className={getButtonClass("news")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><path d="M22,3l-1.67,1.67L18.67,3L17,4.67L15.33,3l-1.66,1.67L12,3l-1.67,1.67L8.67,3L7,4.67L5.33,3L3.67,4.67L2,3v16 c0,1.1,0.9,2,2,2l16,0c1.1,0,2-0.9,2-2V3z M11,19H4v-6h7V19z M20,19h-7v-2h7V19z M20,15h-7v-2h7V15z M20,11H4V8h16V11z" fill="currentColor"></path></g></svg> </span><span>News</span></button></li>
          <li><button type="button" data-target="music" className={getButtonClass("music")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor"></path></svg> </span><span>Music</span></button></li>
          <li><button type="button" data-target="sports" className={getButtonClass("sports")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M12,14 c-1.65,0-3-1.35-3-3V5h6v6C15,12.65,13.65,14,12,14z M19,8c0,1.3-0.84,2.4-2,2.82V7h2V8z" fill="currentColor"></path></svg> </span><span>Sports</span></button></li>
          <li><button type="button" data-target="auto" className={getButtonClass("auto")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z" fill="currentColor"></path><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"></circle><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"></circle></svg> </span><span>Auto</span></button></li>
          <li><button type="button" data-target="animation" className={getButtonClass("animation")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24" x="0"></rect></g><g><g><path d="M15,2c-2.71,0-5.05,1.54-6.22,3.78c-1.28,0.67-2.34,1.72-3,3C3.54,9.95,2,12.29,2,15c0,3.87,3.13,7,7,7 c2.71,0,5.05-1.54,6.22-3.78c1.28-0.67,2.34-1.72,3-3C20.46,14.05,22,11.71,22,9C22,5.13,18.87,2,15,2z M9,20c-2.76,0-5-2.24-5-5 c0-1.12,0.37-2.16,1-3c0,3.87,3.13,7,7,7C11.16,19.63,10.12,20,9,20z M12,17c-2.76,0-5-2.24-5-5c0-1.12,0.37-2.16,1-3 c0,3.86,3.13,6.99,7,7C14.16,16.63,13.12,17,12,17z M16.7,13.7C16.17,13.89,15.6,14,15,14c-2.76,0-5-2.24-5-5 c0-0.6,0.11-1.17,0.3-1.7C10.83,7.11,11.4,7,12,7c2.76,0,5,2.24,5,5C17,12.6,16.89,13.17,16.7,13.7z M19,12c0-3.86-3.13-6.99-7-7 c0.84-0.63,1.87-1,3-1c2.76,0,5,2.24,5,5C20,10.12,19.63,11.16,19,12z" fill="currentColor"></path></g></g></svg> </span><span>Animation</span></button></li>
          <li><button type="button" data-target="business" className={getButtonClass("business")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z" fill="currentColor"></path></svg> </span><span>Business</span></button></li>
          <li><button type="button" data-target="classic" className={getButtonClass("classic")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm6 10h-4V5h4v14zm4-2h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="currentColor"></path></svg> </span><span>Classic</span></button></li>
          <li><button type="button" data-target="comedy" className={getButtonClass("comedy")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M11.99 2C6.47 2 2 6.47 2 12s4.47 10 9.99 10S22 17.53 22 12 17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm1-10.06L14.06 11l1.06-1.06L16.18 11l1.06-1.06-2.12-2.12L13 9.94zm-4.12 0L9.94 11 11 9.94 8.88 7.82 6.76 9.94 7.82 11l1.06-1.06zM12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"></path></svg> </span><span>Comedy</span></button></li>
          <li><button type="button" data-target="cooking" className={getButtonClass("cooking")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><g><path d="M2,19c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2v-3H2V19z M4,18h16v1H4V18z" fill="currentColor"></path><path d="M18.66,11.5c-1.95,0-2.09,1-3.33,1c-1.19,0-1.42-1-3.33-1c-1.95,0-2.09,1-3.33,1c-1.19,0-1.42-1-3.33-1 c-1.95,0-2.09,1-3.33,1v2c1.9,0,2.17-1,3.35-1c1.19,0,1.42,1,3.33,1c1.95,0,2.09-1,3.33-1c1.19,0,1.42,1,3.33,1 c1.95,0,2.09-1,3.33-1c1.19,0,1.4,0.98,3.32,1l-0.01-1.98C20.38,12.19,20.37,11.5,18.66,11.5z" fill="currentColor"></path><path d="M22,9c0.02-4-4.28-6-10-6C6.29,3,2,5,2,9v1h20L22,9L22,9z M4.18,8C5.01,5.81,8.61,5,12,5c3.31,0,5.93,0.73,7.19,1.99 C19.49,7.3,19.71,7.63,19.84,8H4.18z" fill="currentColor"></path></g></g></svg> </span><span>Cooking</span></button></li>
          <li><button type="button" data-target="culture" className={getButtonClass("culture")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-.61.08-1.21.21-1.78L8.99 15v1c0 1.1.9 2 2 2v1.93C7.06 19.43 4 16.07 4 12zm13.89 5.4c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41C17.92 5.77 20 8.65 20 12c0 2.08-.81 3.98-2.11 5.4z" fill="currentColor"></path></svg> </span><span>Culture</span></button></li>
          <li><button type="button" data-target="documentary" className={getButtonClass("documentary")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><path d="M13,11.33L18,18H6l5-6.67V6h2 M15.96,4H8.04C7.62,4,7.39,4.48,7.65,4.81L9,6.5v4.17L3.2,18.4C2.71,19.06,3.18,20,4,20h16 c0.82,0,1.29-0.94,0.8-1.6L15,10.67V6.5l1.35-1.69C16.61,4.48,16.38,4,15.96,4L15.96,4z" fill="currentColor"></path></g></svg> </span><span>Documentary</span></button></li>
          <li><button type="button" data-target="education" className={getButtonClass("education")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" fill="currentColor"></path></svg> </span><span>Education</span></button></li>
          <li><button type="button" data-target="entertainment" className={getButtonClass("entertainment")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm6 10h-4V5h4v14zm4-2h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="currentColor"></path></svg> </span><span>Entertainment</span></button></li>
          <li><button type="button" data-target="family" className={getButtonClass("family")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect><path d="M16,4c0-1.11,0.89-2,2-2s2,0.89,2,2s-0.89,2-2,2S16,5.11,16,4z M20,22v-6h2.5l-2.54-7.63C19.68,7.55,18.92,7,18.06,7h-0.12 c-0.86,0-1.63,0.55-1.9,1.37l-0.86,2.58C16.26,11.55,17,12.68,17,14v8H20z M12.5,11.5c0.83,0,1.5-0.67,1.5-1.5s-0.67-1.5-1.5-1.5 S11,9.17,11,10S11.67,11.5,12.5,11.5z M5.5,6c1.11,0,2-0.89,2-2s-0.89-2-2-2s-2,0.89-2,2S4.39,6,5.5,6z M7.5,22v-7H9V9 c0-1.1-0.9-2-2-2H4C2.9,7,2,7.9,2,9v6h1.5v7H7.5z M14,22v-4h1v-4c0-0.82-0.68-1.5-1.5-1.5h-2c-0.82,0-1.5,0.68-1.5,1.5v4h1v4H14z" fill="currentColor"></path></g></svg> </span><span>Family</span></button></li>
          <li><button type="button" data-target="general" className={getButtonClass("general")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"></path></svg> </span><span>General</span></button></li>
          <li><button type="button" data-target="kids" className={getButtonClass("kids")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><circle cx="14.5" cy="10.5" r="1.25" fill="currentColor"></circle><circle cx="9.5" cy="10.5" r="1.25" fill="currentColor"></circle><path d="M22.94 11.34c-.25-1.51-1.36-2.74-2.81-3.17-.53-1.12-1.28-2.1-2.19-2.91C16.36 3.85 14.28 3 12 3s-4.36.85-5.94 2.26c-.92.81-1.67 1.8-2.19 2.91-1.45.43-2.56 1.65-2.81 3.17-.04.21-.06.43-.06.66 0 .23.02.45.06.66.25 1.51 1.36 2.74 2.81 3.17.52 1.11 1.27 2.09 2.17 2.89C7.62 20.14 9.71 21 12 21s4.38-.86 5.97-2.28c.9-.8 1.65-1.79 2.17-2.89 1.44-.43 2.55-1.65 2.8-3.17.04-.21.06-.43.06-.66 0-.23-.02-.45-.06-.66zM19 14c-.1 0-.19-.02-.29-.03-.2.67-.49 1.29-.86 1.86C16.6 17.74 14.45 19 12 19s-4.6-1.26-5.85-3.17c-.37-.57-.66-1.19-.86-1.86-.1.01-.19.03-.29.03-1.1 0-2-.9-2-2s.9-2 2-2c.1 0 .19.02.29.03.2-.67.49-1.29.86-1.86C7.4 6.26 9.55 5 12 5s4.6 1.26 5.85 3.17c.37.57.66 1.19.86 1.86.1-.01.19-.03.29-.03 1.1 0 2 .9 2 2s-.9 2-2 2zm-7 3c2.01 0 3.74-1.23 4.5-3h-9c.76 1.77 2.49 3 4.5 3z" fill="currentColor"></path></svg> </span><span>Kids</span></button></li>
          <li><button type="button" data-target="legislative" className={getButtonClass("legislative")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M1 21h12v2H1v-2zM5.24 8.07l2.83-2.83 14.14 14.14-2.83 2.83L5.24 8.07zM12.32 1l5.66 5.66-2.83 2.83-5.66-5.66L12.32 1zM3.83 9.48l5.66 5.66-2.83 2.83L1 12.31l2.83-2.83z" fill="currentColor"></path></svg> </span><span>Legislative</span></button></li>
          <li><button type="button" data-target="lifestyle" className={getButtonClass("lifestyle")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M15.49 9.63c-.18-2.79-1.31-5.51-3.43-7.63-2.14 2.14-3.32 4.86-3.55 7.63 1.28.68 2.46 1.56 3.49 2.63 1.03-1.06 2.21-1.94 3.49-2.63zm-3.44-4.44c.63 1.03 1.07 2.18 1.3 3.38-.47.3-.91.63-1.34.98-.42-.34-.87-.67-1.33-.97.25-1.2.71-2.35 1.37-3.39zM12 15.45c-.82-1.25-1.86-2.34-3.06-3.2-.13-.09-.27-.16-.4-.26.13.09.27.17.39.25C6.98 10.83 4.59 10 2 10c0 5.32 3.36 9.82 8.03 11.49.63.23 1.29.4 1.97.51.68-.12 1.33-.29 1.97-.51C18.64 19.82 22 15.32 22 10c-4.18 0-7.85 2.17-10 5.45zm1.32 4.15c-.44.15-.88.27-1.33.37-.44-.09-.87-.21-1.28-.36-3.29-1.18-5.7-3.99-6.45-7.35 1.1.26 2.15.71 3.12 1.33l-.02.01c.13.09.26.18.39.25l.07.04c.99.72 1.84 1.61 2.51 2.65L12 19.1l1.67-2.55c.69-1.05 1.55-1.95 2.53-2.66l.07-.05c.09-.05.18-.11.27-.17l-.01-.02c.98-.65 2.07-1.13 3.21-1.4-.75 3.37-3.15 6.18-6.42 7.35zm-4.33-7.32c-.02-.01-.04-.03-.05-.04 0 0 .01 0 .01.01.01.01.02.02.04.03z" fill="currentColor"></path></svg> </span><span>Lifestyle</span></button></li>
          <li><button type="button" data-target="movies" className={getButtonClass("movies")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M4 6.47L5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z" fill="currentColor"></path></svg> </span><span>Movies</span></button></li>
          <li><button type="button" data-target="outdoor" className={getButtonClass("outdoor")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M14 6l-4.22 5.63 1.25 1.67L14 9.33 19 16h-8.46l-4.01-5.37L1 18h22L14 6zM5 16l1.52-2.03L8.04 16H5z" fill="currentColor"></path></svg> </span><span>Outdoor</span></button></li>
          <li><button type="button" data-target="relax" className={getButtonClass("relax")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><g><circle cx="12" cy="6" r="2" fill="currentColor"></circle><path d="M21,16v-2c-2.24,0-4.16-0.96-5.6-2.68l-1.34-1.6C13.68,9.26,13.12,9,12.53,9h-1.05c-0.59,0-1.15,0.26-1.53,0.72l-1.34,1.6 C7.16,13.04,5.24,14,3,14v2c2.77,0,5.19-1.17,7-3.25V15l-3.88,1.55C5.45,16.82,5,17.48,5,18.21C5,19.2,5.8,20,6.79,20H9v-0.5 c0-1.38,1.12-2.5,2.5-2.5h3c0.28,0,0.5,0.22,0.5,0.5S14.78,18,14.5,18h-3c-0.83,0-1.5,0.67-1.5,1.5V20h7.21 C18.2,20,19,19.2,19,18.21c0-0.73-0.45-1.39-1.12-1.66L14,15v-2.25C15.81,14.83,18.23,16,21,16z" fill="currentColor"></path></g></g></svg> </span><span>Relax</span></button></li>
          <li><button type="button" data-target="religious" className={getButtonClass("religious")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M7 11H1v2h6v-2zm2.17-3.24L7.05 5.64 5.64 7.05l2.12 2.12 1.41-1.41zM13 1h-2v6h2V1zm5.36 6.05l-1.41-1.41-2.12 2.12 1.41 1.41 2.12-2.12zM17 11v2h6v-2h-6zm-5-2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm2.83 7.24l2.12 2.12 1.41-1.41-2.12-2.12-1.41 1.41zm-9.19.71l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM11 23h2v-6h-2v6z" fill="currentColor"></path></svg> </span><span>Religious</span></button></li>
          <li><button type="button" data-target="series" className={getButtonClass("series")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M21 9V7c0-1.65-1.35-3-3-3H6C4.35 4 3 5.35 3 7v2c-1.65 0-3 1.35-3 3v5c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3v-5c0-1.65-1.35-3-3-3zM5 7c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v2.78c-.61.55-1 1.34-1 2.22v2H6v-2c0-.88-.39-1.67-1-2.22V7zm17 10c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1v-5c0-.55.45-1 1-1s1 .45 1 1v4h16v-4c0-.55.45-1 1-1s1 .45 1 1v5z" fill="currentColor"></path></svg> </span><span>Series</span></button></li>
          <li><button type="button" data-target="science" className={getButtonClass("science")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect></g><g><path d="M13,11.33L18,18H6l5-6.67V6h2 M15.96,4H8.04C7.62,4,7.39,4.48,7.65,4.81L9,6.5v4.17L3.2,18.4C2.71,19.06,3.18,20,4,20h16 c0.82,0,1.29-0.94,0.8-1.6L15,10.67V6.5l1.35-1.69C16.61,4.48,16.38,4,15.96,4L15.96,4z" fill="currentColor"></path></g></svg> </span><span>Science</span></button></li>
          <li><button type="button" data-target="shop" className={getButtonClass("shop")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><path d="M0,0h24v24H0V0z" fill="none"></path></g><g><g><path d="M21.41,11.41l-8.83-8.83C12.21,2.21,11.7,2,11.17,2H4C2.9,2,2,2.9,2,4v7.17c0,0.53,0.21,1.04,0.59,1.41l8.83,8.83 c0.78,0.78,2.05,0.78,2.83,0l7.17-7.17C22.2,13.46,22.2,12.2,21.41,11.41z M12.83,20L4,11.17V4h7.17L20,12.83L12.83,20z" fill="currentColor"></path><circle cx="6.5" cy="6.5" r="1.5" fill="currentColor"></circle></g></g></svg> </span><span>Shop</span></button></li>
          <li><button type="button" data-target="travel" className={getButtonClass("travel")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"></path></svg> </span><span>Travel</span></button></li>
          <li><button type="button" data-target="weather" className={getButtonClass("weather")} onClick={handleClick}><span className={iconClass}><svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M11,4V2c0-0.55,0.45-1,1-1s1,0.45,1,1v2c0,0.55-0.45,1-1,1S11,4.55,11,4z M18.36,7.05l1.41-1.42c0.39-0.39,0.39-1.02,0-1.41 c-0.39-0.39-1.02-0.39-1.41,0l-1.41,1.42c-0.39,0.39-0.39,1.02,0,1.41C17.34,7.44,17.97,7.44,18.36,7.05z M22,11h-2 c-0.55,0-1,0.45-1,1s0.45,1,1,1h2c0.55,0,1-0.45,1-1S22.55,11,22,11z M12,19c-0.55,0-1,0.45-1,1v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2 C13,19.45,12.55,19,12,19z M5.64,7.05L4.22,5.64c-0.39-0.39-0.39-1.03,0-1.41s1.03-0.39,1.41,0l1.41,1.41 c0.39,0.39,0.39,1.03,0,1.41S6.02,7.44,5.64,7.05z M16.95,16.95c-0.39,0.39-0.39,1.03,0,1.41l1.41,1.41c0.39,0.39,1.03,0.39,1.41,0 c0.39-0.39,0.39-1.03,0-1.41l-1.41-1.41C17.98,16.56,17.34,16.56,16.95,16.95z M2,13h2c0.55,0,1-0.45,1-1s-0.45-1-1-1H2 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M5.64,19.78l1.41-1.41c0.39-0.39,0.39-1.03,0-1.41s-1.03-0.39-1.41,0l-1.41,1.41 c-0.39,0.39-0.39,1.03,0,1.41C4.61,20.17,5.25,20.17,5.64,19.78z M12,6c-3.31,0-6,2.69-6,6s2.69,6,6,6s6-2.69,6-6S15.31,6,12,6z" fill="currentColor"></path></svg> </span><span>Weather</span></button></li>
          {/* --- End of category list --- */}

        </ul>
      </div>

      {/* === Bottom Section === */}
      {/* mt-auto pushes this section to the bottom */}
      <div className="flex flex-col mt-auto pt-4">
        <hr className="my-4 border-gray-700" />
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              data-target="faq"
              className={getButtonClass("faq")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"></path><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" fill="currentColor"></path></svg>
              </span>
              <span>FAQ</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              data-target="privacy-policy"
              className={getButtonClass("privacy-policy")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"></rect><path d="M12,3.19l7,3.11V11c0,4.52-2.98,8.69-7,9.93C7.98,19.69,5,15.52,5,11V6.3L12,3.19 M12,1L3,5v6c0,5.55,3.84,10.74,9,12 c5.16-1.26,9-6.45,9-12V5L12,1L12,1z M11,7h2v2h-2V7z M11,11h2v6h-2V11z" fill="currentColor"></path></g></svg>
              </span>
              <span>Privacy Policy</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              data-target="feedback"
              className={getButtonClass("feedback")}
              onClick={handleClick}
            >
              <span className={iconClass}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"><path d="M22 2H2.01L2 22l4-4h16V2zm-2 14H6l-2 2V4h16v12z"></path></svg>
              </span>
              <span>Feedback</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}