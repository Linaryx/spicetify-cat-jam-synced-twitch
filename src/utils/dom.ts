export async function waitForElement(
  selector: string,
  maxAttempts = 50,
  interval = 100,
): Promise<Element> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }
  throw new Error(
    `Element ${selector} not found after ${maxAttempts} attempts.`,
  );
}
