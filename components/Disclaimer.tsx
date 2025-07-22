interface DisclaimerProps {
  className?: string;
  compact?: boolean;
}

export default function Disclaimer({ className = "", compact = false }: DisclaimerProps) {
  const fullText = (
    <>
      <strong>Medical Disclaimer:</strong> This AI assistant provides educational information only 
      and should not replace professional medical advice, diagnosis, or treatment. Always seek the 
      advice of qualified healthcare providers with any questions you may have regarding a medical 
      condition. Never disregard professional medical advice or delay in seeking it because of 
      information provided by this AI assistant. In case of medical emergency, contact emergency 
      services immediately.
    </>
  );

  const compactText = (
    <>
      <strong>Medical Disclaimer:</strong> Educational information only. Always consult healthcare providers for medical advice.
    </>
  );

  return (
    <div className={`disclaimer-text ${className}`}>
      {compact ? compactText : fullText}
    </div>
  );
}