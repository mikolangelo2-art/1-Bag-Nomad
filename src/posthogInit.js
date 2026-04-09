import posthog from "posthog-js";

if (typeof window !== "undefined") {
  posthog.init("phc_O9hQZjy2VLHhAPuZPFhQeZTfAtXnXKfZh39qWZS966u", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (ph) => {
      if (window.location.hostname === "localhost") ph.opt_out_capturing();
    },
  });
}
