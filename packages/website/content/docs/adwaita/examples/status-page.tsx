"use client";

import { AdwStatusPage } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwStatusPage
      iconName="DialogInformation"
      title="No Results"
      description="Try a different search term."
      style={{ height: 320 }}
    />
  );
}
