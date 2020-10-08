import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import ms from 'ms';
import fetch from 'node-fetch';
import path from 'path';
import sleep from 'sleep-promise';

class HentaiCoverScraper {
  public targetFolder = path.join(__dirname, '..', 'out');

  public host = 'https://hentai-covers.site';

  public page = 1;

  public get pageUrl() {
    return `${this.host}/?list=images&sort=date_asc&page=${this.page}`
  }

  public constructor(page = 1) {
    this.page = page;
  }

  public async scrape() {
    while (true) {
      try {
        console.log(`page: ${this.page}`);
        const { window: { document } } = await JSDOM.fromURL(this.pageUrl);
        const divs = document.querySelectorAll('div.pad-content-listing > div');
        await Promise.allSettled(Array.from(divs).map((div: any) => {
          const a = div.querySelector('a');
          const img = a?.querySelector('img');
          const title = div.querySelector('.list-item-desc-title a')?.textContent;
          if (!(a && img)) {
            return;
          }
          const fileName = `${path.basename(a.href)}_${title}`.replace(/[/\\?%*:|"<>]/g, '-').substr(0, 100) + `_${path.basename(img.src)}`;
          return this.save(fileName, img.src);
        }));
        return divs.length ? this.page + 1 : 0;
      } catch (e) {
        console.error(e);
        await sleep(ms('3s'));
      }
    }
  }

  private async save(fileName: string, url: string) {
    let processing = true;
    while (processing) {
      try {
        const content = await fetch(url).then((p) => p.buffer());
        await fs.writeFile(path.join(this.targetFolder, fileName), content);
        processing = false;
      } catch (e) {
        console.error(e);
        await sleep(ms('3s'));
      }
    }
  }
}

class Main {
  public static async main() {
    let nextPage = 1;
    while (nextPage) {
      nextPage = await new HentaiCoverScraper(nextPage).scrape();
    }
  }
}

Main.main().catch(console.error);
