import { Fragment, useEffect, useRef } from "react";
import { parseTemplate } from "../grader/assemble.js";
import { highlight } from "./highlight";

type Props = {
  template: string;
  values: string[];
  onChange: (values: string[]) => void;
  onSubmit?: () => void;
  wrong?: boolean[];
  autoFocus?: boolean;
};

/** Read-only highlighted code with a text box for each [[blank]]. */
export default function FillCode({ template, values, onChange, onSubmit, wrong = [], autoFocus }: Props) {
  const { parts, blanks } = parseTemplate(template) as { parts: string[]; blanks: { answer: string }[] };
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) first.current?.focus({ preventScroll: true });
  }, [template, autoFocus]);

  return (
    <pre className="codeview fillcode">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {highlight(p, `p${i}-`)}
          {i < blanks.length && (
            <input
              ref={i === 0 ? first : undefined}
              className={"blank" + (wrong[i] ? " blank-wrong" : "")}
              aria-label={`Blank ${i + 1} of ${blanks.length} in the code`}
              aria-invalid={wrong[i] ? true : undefined}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint={i === blanks.length - 1 ? "done" : "next"}
              value={values[i] ?? ""}
              style={{ width: `${Math.max(3, (values[i] ?? "").length, blanks[i].answer.length) + 1.5}ch` }}
              onChange={(e) => {
                const next = [...values];
                while (next.length < blanks.length) next.push("");
                next[i] = e.target.value;
                onChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (e.ctrlKey || e.metaKey || i === blanks.length - 1) onSubmit?.();
                else (e.currentTarget.parentElement?.querySelectorAll("input.blank")[i + 1] as HTMLInputElement | undefined)?.focus();
              }}
            />
          )}
        </Fragment>
      ))}
    </pre>
  );
}
