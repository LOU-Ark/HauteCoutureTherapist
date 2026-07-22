module.exports = {
  server: true,
  files: [
    "**/*.html",
    "**/*.css",
    "**/*.js"
  ],
  ignore: [
    "node_modules/**/*",
    ".agent/**/*",
    "management/03_Implementation/chat_logs/**/*",
    "**/*_chat.md",
    "**/*_chat.json"
  ]
};
