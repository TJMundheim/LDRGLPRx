import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

describe('home page book row', () => {
  it('keeps the three Begin with the End in Mind Amazon links', () => {
    for (const asin of ['B0H7FJRHXC', 'B0HCXZQBKY', 'B0H75TYF1G']) {
      expect(src).toContain(`https://www.amazon.com/dp/${asin}`);
    }
  });
  it('links The Uninsured Decade Kindle and Count Yourself Skinny paperback', () => {
    expect(src).toContain('https://www.amazon.com/dp/B0HRS43K48');
    expect(src).toContain('https://www.amazon.com/dp/B0HRTNDNRQ');
    expect(src).toContain('https://www.amazon.com/dp/B0HRS79T35');
    expect(src).toContain('https://www.amazon.com/dp/B0HRSDVGFT');
    expect(src).toContain("book:'uninsured-decade', format:'kindle'");
    expect(src).toContain("book:'count-yourself-skinny', format:'paperback'");
    expect(src).not.toMatch(/tag=/);
  });
  it('uses the new cover images', () => {
    expect(src).toContain('/images/books/uninsured-decade-cover.jpg');
    expect(src).toContain('/images/books/count-yourself-skinny-cover.jpg');
  });
});
