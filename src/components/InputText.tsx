/** Input text as a program reads it, with a visible note when it ends with an empty line. */
export default function InputText({ text }: { text: string }) {
  const body = text.replace(/\n$/, "");
  if (!/\n\n$/.test(text)) return <>{body}</>;
  return (
    <>
      {body.replace(/\n$/, "")}
      {"\n"}
      <span className="input-empty">(an empty line)</span>
    </>
  );
}
