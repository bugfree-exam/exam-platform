export const WEBINAR_PRACTICE_MATERIAL_TITLE = "🎯 Задания для отработки";

export function getWebinarPracticeUrl(webinarId: string, homeworkId: string) {
  return `/student/webinars/${webinarId}/practice/${homeworkId}`;
}

export function getHomeworkIdFromWebinarPracticeUrl(url: string) {
  const match = url.match(/^\/student\/webinars\/[^/]+\/practice\/([^/?#]+)/);
  return match?.[1]?.trim() || null;
}

export function isWebinarPracticeUrl(url: string) {
  return Boolean(getHomeworkIdFromWebinarPracticeUrl(url));
}
