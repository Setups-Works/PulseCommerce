import { Config } from "@remotion/cli/config";

/**
 * H.264 in an MP4: the format every social platform accepts without
 * re-encoding. The still image format is PNG so a frame can be pulled for a
 * thumbnail without artefacts.
 */
Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setOverwriteOutput(true);
