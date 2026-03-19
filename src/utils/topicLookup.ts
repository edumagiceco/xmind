import type { Topic } from '../model/types';

/** Build a flat ID -> Topic lookup map from a topic tree */
export function buildTopicMap(root: Topic): Map<string, Topic> {
  const map = new Map<string, Topic>();
  const traverse = (topic: Topic) => {
    map.set(topic.id, topic);
    for (const child of topic.children.attached) traverse(child);
    for (const child of topic.children.detached) traverse(child);
  };
  traverse(root);
  return map;
}

/** Find a topic by ID using a pre-built map (O(1)) or tree search fallback (O(n)) */
export function findTopicById(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const child of root.children.attached) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  for (const child of root.children.detached) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  return null;
}
