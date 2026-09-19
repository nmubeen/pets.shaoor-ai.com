const LOGOS = {
  pets: { src: "/brand/shaoor-ai-pets-standard.png", alt: "Shaoor-AI Pets" },
  techConsultants: { src: "/brand/shaoor-ai-tech-consultants-standard.png", alt: "Shaoor-AI Tech Consultants" },
} as const;

/** The brand logo in its standard 60x60 white tile with 10px rounded corners. */
export function BrandLogo({ logo = "pets" }: { logo?: keyof typeof LOGOS }) {
  const { src, alt } = LOGOS[logo];
  return (
    <span className="w-[60px] h-[60px] rounded-[10px] bg-white shadow-lg flex items-center justify-center flex-none overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-contain" />
    </span>
  );
}
