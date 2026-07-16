import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "hr",

  "h1",
  "h2",
  "h3",
  "h4",

  "ul",
  "ol",
  "li",

  "pre",
  "code",

  "a",
  "img",

  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
];

export function sanitizeEditorHtml(value: string) {
  return sanitizeHtml(value || "", {
    allowedTags: ALLOWED_TAGS,

    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "class"],

      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],

      table: ["style"],
      col: ["style", "width"],
      th: ["colspan", "rowspan", "colwidth", "style"],
      td: ["colspan", "rowspan", "colwidth", "style"],
    },

    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,

    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        width: [/^\d+(\.\d+)?(px|%)$/],
        "min-width": [/^\d+(\.\d+)?(px|%)$/],
      },
    },

    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName,
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
  }).trim();
}

export function hasEditorContent(value: string) {
  const withoutTags = sanitizeHtml(value || "", {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, "")
    .replace(/\s/g, "");

  const hasText = withoutTags.length > 0;
  const hasImage = /<img[\s>]/i.test(value);
  const hasTable = /<table[\s>]/i.test(value);

  return hasText || hasImage || hasTable;
}