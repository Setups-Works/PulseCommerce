import React from "react";
import { Composition } from "remotion";
import { DURATION, Promo } from "./Promo";
import { FPS, SIDE } from "./theme";

/**
 * Two shapes of the same film.
 *
 * Square for a feed, vertical for Reels and status. One composition each rather
 * than one that guesses, because the scenes lay out differently at 9:16 and a
 * silent crop is how text ends up off screen.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={SIDE}
      height={SIDE}
    />
    <Composition
      id="PromoVertical"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);
