import { useEffect } from "react";
import { SITE_NAME } from "./site";

/** Sets the browser tab title (screen readers read it first after navigation). */
export function useTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: learn Java in your browser`;
  }, [title]);
}
