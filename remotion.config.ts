import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

/**
 * Tailwind, so the film can use the application's own components.
 *
 * Without this the video bundler has no idea what a `bg-card` is, and every
 * shadcn component renders unstyled. With it, `globals.css` is compiled into
 * the film exactly as it is into the app — same tokens, same radii, same
 * spacing — which is what makes the two pixel-identical rather than merely
 * similar.
 */
Config.overrideWebpackConfig(enableTailwind);

Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setOverwriteOutput(true);
