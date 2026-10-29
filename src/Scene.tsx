export function Scene({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`landscape ${className}`}
      viewBox="0 0 1000 340"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="500" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e3e8dd" />
          <stop offset="1" stopColor="#f0ede2" />
        </linearGradient>
        <linearGradient id="hill" x1="0" y1="190" x2="300" y2="440" gradientUnits="userSpaceOnUse">
          <stop stopColor="#91a18a" />
          <stop offset="1" stopColor="#6c8573" />
        </linearGradient>
        <linearGradient
          id="front"
          x1="600"
          y1="180"
          x2="600"
          y2="400"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#728c76" />
          <stop offset="1" stopColor="#526f60" />
        </linearGradient>
        <linearGradient
          id="mist"
          x1="500"
          y1="220"
          x2="500"
          y2="400"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0eee4" stopOpacity="0" />
          <stop offset="1" stopColor="#e5e8db" stopOpacity=".4" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h1000v400H0z" />
      <circle cx="715" cy="99" r="35" fill="#f9f5e7" />
      <path
        d="M0 257C105 235 129 163 211 190c48 16 63-31 105-29 64 3 85 70 146 58 72-13 83-91 149-89 72 3 103 97 183 75 81-23 111-81 206-56v251H0Z"
        fill="#c1cbb7"
      />
      <path
        d="M0 310c86-80 126-35 192-83 49-37 77-50 131-14 65 43 88 9 137-9 77-30 115 89 192 62 72-25 128-63 185-23 75 53 113 27 163 3v154H0Z"
        fill="#aabca3"
      />
      <path
        d="M0 240c72-2 120 20 174 58 62 44 98 15 160 36 78 27 98 51 162 66H0Z"
        fill="url(#hill)"
      />
      <path
        d="M1000 192c-80 7-124 45-172 91-75 70-152 12-213 52-31 20-63 43-91 65h476Z"
        fill="url(#front)"
      />
      <path
        d="M505 282c-44 23-28 46 20 57s50 35 2 61h94c22-39-36-46-75-63s-58-29-19-55Z"
        fill="#e1e6d6"
        opacity=".8"
      />
      <path d="M0 220h1000v180H0z" fill="url(#mist)" />
      <g stroke="#627861" strokeWidth="2" strokeLinecap="round" opacity=".5">
        <path d="m391 94 7-4 7 4M420 82l5-3 5 3" />
      </g>
      <g fill="#466452" opacity=".65">
        <path d="m890 294 10-30 10 30h-7v19h-6v-19ZM913 312l8-26 8 26h-6v15h-4v-15ZM150 333l8-25 8 25h-6v16h-4v-16Z" />
      </g>
    </svg>
  );
}
