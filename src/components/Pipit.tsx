export function Pipit({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "pipit small" : "pipit"}
      viewBox="0 0 460 340"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="243"
        cy="297"
        rx="155"
        ry="17"
        fill="#173D35"
        opacity=".06"
      />
      <path
        d="M51 291c103-18 189-5 347-53"
        stroke="#809C78"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M330 258c-31-48-6-79 34-82 6 39-1 65-34 82Z" fill="#8DAE7E" />
      <path d="M369 246c12-42 40-48 66-36-14 30-35 43-66 36Z" fill="#ADC595" />
      <path d="m330 258 27-57m13 45 40-25" stroke="#6C8D67" strokeWidth="2" />
      <path
        d="M167 251 157 279m44-25 8 24"
        stroke="#A87B42"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m149 280 24-2m26 2 23-1"
        stroke="#A87B42"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M115 221 60 187l19 59 55 8" fill="#246B55" />
      <path
        d="M111 201c-1-57 38-91 86-93 47-2 83 29 81 77-1 50-32 78-82 78-47 0-80-18-85-62Z"
        fill="#347E60"
      />
      <path
        d="M177 121c20-38 68-46 103-20 31 22 35 58 19 86l-48 26-74-92Z"
        fill="#347E60"
      />
      <path
        d="M194 151c26-17 67-10 79 20 12 31-1 74-39 86-41 12-79-7-80-33-1-30 14-56 40-73Z"
        fill="#DFE9C5"
      />
      <path d="M137 176c32-12 64 2 74 28-34 23-66 15-74-28Z" fill="#246B55" />
      <path d="m295 139 30 14-31 11" fill="#E9B85A" />
      <circle cx="276" cy="133" r="5" fill="#173D35" />
      <circle cx="278" cy="131" r="1.5" fill="white" />
      <path d="M227 94c1-18 14-31 25-36 4 18-2 31-16 39" fill="#246B55" />
      <path
        d="m97 109 5-10m-30 48-11-3m266-69 8-8"
        stroke="#9DB294"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="345" cy="123" r="5" fill="#E9B85A" />
      <circle cx="91" cy="79" r="4" fill="#E9B85A" />
    </svg>
  );
}
