import type { Topic } from '../model/types';

const IMAGE_TEXT_GAP = 6;
const MAX_IMAGE_WIDTH = 300;

/**
 * Calculate the additional height an image adds to a node.
 * Returns 0 if the topic has no image.
 */
export function getImageLayoutHeight(topic: Topic, nodeWidth: number, paddingX: number): number {
  if (!topic.image) return 0;
  const maxW = Math.min(MAX_IMAGE_WIDTH, nodeWidth - paddingX * 2);
  const displayW = Math.min(topic.image.width, maxW);
  const displayH = displayW * (topic.image.height / topic.image.width);
  return displayH + IMAGE_TEXT_GAP;
}

/**
 * Calculate the minimum node width needed for an image.
 */
export function getImageMinWidth(topic: Topic, paddingX: number): number {
  if (!topic.image) return 0;
  return Math.min(topic.image.width, MAX_IMAGE_WIDTH) + paddingX * 2;
}
