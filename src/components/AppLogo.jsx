export default function AppLogo({ className = 'h-8 w-8' }) {
  return (
    <img
      src="/brand/logo-appli-512.png"
      width={512}
      height={512}
      className={`${className} object-contain`}
      alt="QMS SaaS"
    />
  );
}
