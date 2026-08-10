export type WebinarVideoProviderValue = "RUTUBE" | "YANDEX_DISK" | "EXTERNAL";

function buildRutubeEmbedUrl(videoId: string, accessKey?: string | null) {
  const baseUrl = `https://rutube.ru/play/embed/${videoId}`;

  if (!accessKey) {
    return baseUrl;
  }

  return `${baseUrl}/?p=${encodeURIComponent(accessKey)}`;
}

export function getRutubeEmbedUrl(url: string) {
  const value = url.trim();

  try {
    const parsedUrl = new URL(value);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname !== "rutube.ru") {
      return value;
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const accessKey = parsedUrl.searchParams.get("p");

    if (pathParts[0] === "play" && pathParts[1] === "embed" && pathParts[2]) {
      return buildRutubeEmbedUrl(pathParts[2], accessKey);
    }

    if (pathParts[0] === "video") {
      if (pathParts[1] === "private" && pathParts[2]) {
        return buildRutubeEmbedUrl(pathParts[2], accessKey);
      }

      if (pathParts[1]) {
        return buildRutubeEmbedUrl(pathParts[1], accessKey);
      }
    }
  } catch {
    // Ниже оставлен fallback для неполных/нестандартных ссылок.
  }

  const privateVideoMatch = value.match(
    /rutube\.ru\/video\/private\/([a-zA-Z0-9-]+)/
  );
  const accessKeyMatch = value.match(/[?&]p=([^&#]+)/);
  const accessKey = accessKeyMatch?.[1]
    ? decodeURIComponent(accessKeyMatch[1])
    : null;

  if (privateVideoMatch?.[1]) {
    return buildRutubeEmbedUrl(privateVideoMatch[1], accessKey);
  }

  const embedMatch = value.match(/rutube\.ru\/play\/embed\/([a-zA-Z0-9-]+)/);

  if (embedMatch?.[1]) {
    return buildRutubeEmbedUrl(embedMatch[1], accessKey);
  }

  const videoMatch = value.match(/rutube\.ru\/video\/([a-zA-Z0-9-]+)/);

  if (videoMatch?.[1]) {
    return buildRutubeEmbedUrl(videoMatch[1], accessKey);
  }

  return value;
}

export function getGenericVideoEmbedUrl(url: string) {
  const value = url.trim();

  if (value.includes("rutube.ru/")) {
    return getRutubeEmbedUrl(value);
  }

  const youtubeWatch = value.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (youtubeWatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeWatch[1]}`;
  }

  const youtubeShort = value.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (youtubeShort?.[1]) {
    return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  }

  const youtubeEmbed = value.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (youtubeEmbed?.[1]) {
    return `https://www.youtube.com/embed/${youtubeEmbed[1]}`;
  }

  return value;
}

export function getWebinarEmbedUrl({
  provider,
  videoUrl,
  videoEmbedUrl,
}: {
  provider: WebinarVideoProviderValue;
  videoUrl: string;
  videoEmbedUrl: string | null;
}) {
  const manualEmbedUrl = videoEmbedUrl?.trim();

  if (manualEmbedUrl) {
    return manualEmbedUrl;
  }

  if (provider === "RUTUBE") {
    return getRutubeEmbedUrl(videoUrl);
  }

  return videoUrl.trim();
}

export function getVideoProviderLabel(provider: WebinarVideoProviderValue) {
  if (provider === "RUTUBE") {
    return "RuTube";
  }

  if (provider === "YANDEX_DISK") {
    return "Яндекс.Диск";
  }

  return "Внешний источник";
}
