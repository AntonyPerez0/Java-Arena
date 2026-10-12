/**
 * The small "Extra" label shown next to an extra module's number or title (course: extra in
 * content/course.yaml): a module of Java Arena's own, after the course, that is not part of the
 * University of Helsinki's MOOC. Shown wherever a module's number or MOOC section would be.
 */
export default function ExtraTag({ module: m }: { module: { course: string } | undefined | null }) {
  if (m?.course !== "extra") return null;
  return (
    <span className="extra-tag" title="An extra module: not part of the University of Helsinki's MOOC">
      Extra
    </span>
  );
}
