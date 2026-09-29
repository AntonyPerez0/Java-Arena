import { Link } from "react-router-dom";
import { useTitle } from "../lib/title";

export default function NotFound() {
  useTitle("Page not found");
  return (
    <div className="page-head narrow">
      <h1>Page not found</h1>
      <p>There's no page at this address. It may have moved, or the link may have a typo.</p>
      <p>
        <Link to="/learn">See all modules</Link> or <Link to="/">go to the home page</Link>.
      </p>
    </div>
  );
}
