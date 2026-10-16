/** Logs the test run's progress to stderr when GTK_JS_TEST_DEBUG is set. */
export function debugLog(scope: string, message: string): void {
  if (process.env.GTK_JS_TEST_DEBUG != null) {
    console.error(`[${scope}] ${message}`);
  }
}
