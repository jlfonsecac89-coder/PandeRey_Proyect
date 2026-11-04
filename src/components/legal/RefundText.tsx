import { Fragment } from "react";

// Párrafos de texto plano con **negrita**. No interpreta HTML: lo que escribe el
// gerente nunca se inserta como marcado, solo como texto.
export function RefundText({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4 ? (
              <strong key={j}>{chunk.slice(2, -2)}</strong>
            ) : (
              <Fragment key={j}>{chunk}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
