import mark from '../assets/mark.svg';

// Marchio "Time Manager Mark" esportato da Figma (04 - Brand & Logo).
export default function Logo({ size = 40 }) {
  return (
    <img
      className="logo-mark"
      src={mark}
      alt="Time Manager"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.28 }}
    />
  );
}
