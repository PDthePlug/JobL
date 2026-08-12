async function testFetch() {
  const url = 'https://www.dpsa.gov.za/newsroom/psvc/';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });
  const html = await res.text();
  console.log('HTML length:', html.length);
  const hrefs = [...html.matchAll(/href=['"]([^'"]+)['"]/gi)].map(m => m[1]);
  console.log('All hrefs matching psvc or circular:', hrefs.filter(h => h.includes('psvc') || h.includes('circular')));
}
testFetch();
