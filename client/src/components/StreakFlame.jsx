import React from 'react';

export default function StreakFlame({ streak, size = 120 }) {
  const fireIntensity = streak >= 100 ? 1 : streak >= 30 ? 0.8 : streak >= 7 ? 0.6 : 0.4;
  const glowColor = streak >= 30 ? '#ff6b00' : streak >= 7 ? '#ff9600' : '#ffb347';

  return (
    <div
      className="streak-flame"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="flame-svg"
      >
        <defs>
          <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="45" fill="url(#flameGlow)" className="flame-glow" />

        <path
          d="M50 15 C45 30, 30 40, 35 55 C38 65, 45 70, 50 75 C55 70, 62 65, 65 55 C70 40, 55 30, 50 15Z"
          fill="#ff9600"
          className="flame-inner"
        >
          <animate
            attributeName="d"
            values="M50 15 C45 30, 30 40, 35 55 C38 65, 45 70, 50 75 C55 70, 62 65, 65 55 C70 40, 55 30, 50 15Z;
                    M50 12 C43 28, 28 38, 33 53 C36 63, 44 68, 50 73 C56 68, 64 63, 67 53 C72 38, 57 28, 50 12Z;
                    M50 15 C45 30, 30 40, 35 55 C38 65, 45 70, 50 75 C55 70, 62 65, 65 55 C70 40, 55 30, 50 15Z"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M50 25 C47 35, 38 42, 42 52 C44 58, 48 62, 50 65 C52 62, 56 58, 58 52 C62 42, 53 35, 50 25Z"
          fill="#ffc800"
          className="flame-outer"
        >
          <animate
            attributeName="d"
            values="M50 25 C47 35, 38 42, 42 52 C44 58, 48 62, 50 65 C52 62, 56 58, 58 52 C62 42, 53 35, 50 25Z;
                    M50 22 C45 32, 36 40, 40 50 C42 56, 47 60, 50 63 C53 60, 58 56, 60 50 C64 40, 55 32, 50 22Z;
                    M50 25 C47 35, 38 42, 42 52 C44 58, 48 62, 50 65 C52 62, 56 58, 58 52 C62 42, 53 35, 50 25Z"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M50 35 C48 40, 44 44, 46 50 C47 53, 49 55, 50 57 C51 55, 53 53, 54 50 C56 44, 52 40, 50 35Z"
          fill="#ffee58"
          className="flame-core"
        />
      </svg>

      <div className="flame-count" style={{ fontSize: size * 0.32 }}>
        {streak}
      </div>
    </div>
  );
}
