import { useEffect, useState } from "react";
import { fetchSearchDomains } from "../services/api";
import type { SearchDomainOption } from "../models";

export const DEFAULT_DOMAIN_OPTIONS: SearchDomainOption[] = [
  { name: "web", description: "Search without a category restriction" },
];

export function useSearchDomains() {
  const [options, setOptions] = useState(DEFAULT_DOMAIN_OPTIONS);
  useEffect(() => {
    let active = true;
    fetchSearchDomains()
      .then(({ domains }) => {
        if (active && domains.length) setOptions(domains);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return options;
}
