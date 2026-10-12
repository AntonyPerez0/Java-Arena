import { Link } from "react-router-dom";
import { moduleById, modulePath, projectAfter } from "../content";

/** "After module 20: Lists of objects": the module a project comes after, linked when it's written. */
export default function AfterModule({ p }: { p: { after: string } }) {
  const after = projectAfter(p);
  if (!after) return null;
  const live = moduleById.get(after.id);
  const name = `module ${after.number}: ${after.title}`;
  return <>After {live ? <Link to={modulePath(live)}>{name}</Link> : name}</>;
}
