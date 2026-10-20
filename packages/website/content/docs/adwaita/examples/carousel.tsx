"use client";

import { AdwCarousel, AdwCarouselIndicatorDots, AdwStatusPage } from "@gtk-js/adwaita";
import { GtkBox, GtkButton, GtkCenterBox } from "@gtk-js/gtk4";
import { useState } from "react";

const features = [
  {
    iconName: "EmojiNature",
    title: "Welcome to Photos",
    description: "Browse every picture you've taken, sorted by when and where.",
  },
  {
    iconName: "FolderPictures",
    title: "Albums",
    description: "Group trips, people and projects into albums that sync everywhere.",
  },
  {
    iconName: "PreferencesColor",
    title: "Quick Edits",
    description: "Crop, straighten and adjust colors without leaving the viewer.",
  },
];

export default function Example() {
  const [page, setPage] = useState(0);
  const [position, setPosition] = useState(0);
  const nPages = features.length + 1;

  return (
    <GtkBox orientation="vertical" className="card" style={{ width: 380 }}>
      <AdwCarousel
        page={page}
        onPageChanged={setPage}
        onPositionChanged={setPosition}
        spacing={12}
        style={{ height: 280 }}
      >
        {features.map((feature) => (
          <AdwStatusPage key={feature.title} className="compact" {...feature} />
        ))}
        <AdwStatusPage className="compact" iconName="Starred" title="You're All Set">
          <GtkButton
            label="Start Over"
            className="pill suggested-action"
            halign="center"
            onClicked={() => setPage(0)}
          />
        </AdwStatusPage>
      </AdwCarousel>
      <GtkCenterBox
        style={{ padding: 6 }}
        startWidget={
          <GtkButton
            iconName="GoPrevious"
            className="flat circular"
            tooltipText="Previous"
            disabled={page === 0}
            onClicked={() => setPage(page - 1)}
          />
        }
        centerWidget={<AdwCarouselIndicatorDots nPages={nPages} position={position} />}
        endWidget={
          <GtkButton
            iconName="GoNext"
            className="flat circular"
            tooltipText="Next"
            disabled={page === nPages - 1}
            onClicked={() => setPage(page + 1)}
          />
        }
      />
    </GtkBox>
  );
}
