export class PaginationHandler {
  constructor(maxPages = 10, maxRecords = 1000) {
    this.maxPages = maxPages;
    this.maxRecords = maxRecords;
    this.currentPage = 0;
    this.totalRecords = 0;
    this.allData = [];
  }

  async fetchAllPages(fetchFunction) {
    let hasMoreData = true;
    let page = 1;

    while (
      hasMoreData &&
      page <= this.maxPages &&
      this.totalRecords < this.maxRecords
    ) {
      try {
        const response = await fetchFunction(page);
        const pageData = response.data || response;

        if (!pageData || pageData.length === 0) {
          hasMoreData = false;
          break;
        }

        this.allData.push(...pageData);
        this.totalRecords += pageData.length;

        if (this.totalRecords >= this.maxRecords) {
          this.allData = this.allData.slice(0, this.maxRecords);
          break;
        }

        if (pageData.length < 50) {
          hasMoreData = false;
        }
        page++;
      } catch (error) {
        hasMoreData = false;
      }
    }

    return this.allData;
  }

  configureLimits(maxPages, maxRecords) {
    this.maxPages = maxPages;
    this.maxRecords = maxRecords;
  }
}
