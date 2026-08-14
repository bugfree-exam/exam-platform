export const WEBINAR_PRACTICE_MATERIAL_TITLE = "Задания для отработки";
const PRACTICE_PATH_PREFIX = "/student/homeworks/";

export function getWebinarPracticeUrl(homeworkId: string) {
  return `${PRACTICE_PATH_PREFIX}${homeworkId}`;
}

export function getHomeworkIdFromWebinarPracticeUrl(url: string) {
  if (!url.startsWith(PRACTICE_PATH_PREFIX)) return null;

  const homeworkId = url.slice(PRACTICE_PATH_PREFIX.length).split(/[?#/]/)[0]?.trim();
  return homeworkId || null;
}

export function isWebinarPracticeUrl(url: string) {
  return Boolean(getHomeworkIdFromWebinarPracticeUrl(url));
}
