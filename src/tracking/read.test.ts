import { describe, expect, it } from 'vitest';
import { readTracking } from './read.ts';

function page(carrier: string, inner: string): string {
  return `<!doctype html><html><body><nav>menu</nav><div id="cookie">Souhlasím</div><script>var x=1</script><div data-carrier="${carrier}">${inner}</div><footer>f</footer></body></html>`;
}

describe('readTracking', () => {
  it('reads Rychlopost newest row first and ignores doručeno na depo below it', () => {
    const html = page(
      'rychlopost',
      `<table class="rp-events"><tbody>
        <tr><td class="when">03.11.2026 08:00</td><td class="what">V přepravě</td></tr>
        <tr><td class="when">02.11.2026 08:00</td><td class="what">Doručeno na depo</td></tr>
      </tbody></table>`,
    );
    const reading = readTracking(html);
    expect(reading.status).toBe('v přepravě');
    if (reading.status !== 'nevím') expect(reading.ruleId).toBe('rychlopost.latest-event.in-transit');
  });

  it('does not treat nedoručeno as doručeno', () => {
    const html = page(
      'rychlopost',
      `<table class="rp-events"><tbody><tr><td class="when">03.11.2026 08:00</td><td class="what">Nedoručeno, další pokus</td></tr></tbody></table>`,
    );
    expect(readTracking(html).status).toBe('v přepravě');
  });

  it('maps Doručení se nezdařilo to in transit', () => {
    const html = page(
      'rychlopost',
      `<table class="rp-events"><tbody><tr><td class="when">03.11.2026 08:00</td><td class="what">Doručení se nezdařilo</td></tr></tbody></table>`,
    );
    expect(readTracking(html).status).toBe('v přepravě');
  });

  it('reads a return and a delivery', () => {
    const back = page(
      'rychlopost',
      `<table class="rp-events"><tbody><tr><td class="when">03.11.2026 08:00</td><td class="what">Zásilka se vrací odesílateli</td></tr></tbody></table>`,
    );
    const delivered = page(
      'rychlopost',
      `<table class="rp-events"><tbody><tr><td class="when">03.11.2026 08:00</td><td class="what">Doručeno příjemci</td></tr></tbody></table>`,
    );
    expect(readTracking(back).status).toBe('vrací se');
    expect(readTracking(delivered).status).toBe('doručeno');
  });

  it('Rychlopost frame with no scans is no_carrier_events', () => {
    const html = page('rychlopost', `<p>Zásilka evidována</p><table class="rp-events"><tbody></tbody></table>`);
    const reading = readTracking(html);
    expect(reading.status).toBe('nevím');
    if (reading.status === 'nevím') expect(reading.cause).toBe('no_carrier_events');
  });

  it('Rychlopost v2 template abstains', () => {
    const html = page('rychlopost', `<div class="rp-v2"><p class="rp-v2-status">Doručeno příjemci</p></div>`);
    const reading = readTracking(html);
    expect(reading.status).toBe('nevím');
    if (reading.status === 'nevím') expect(reading.cause).toBe('unrecognized_template');
  });

  it('PaketNet uses the last event', () => {
    const html = page(
      'paketnet',
      `<ol class="pn-timeline">
        <li><time>2026-10-01 09:00</time><span class="what">Doručeno na depo</span></li>
        <li><time>2026-11-03 08:00</time><span class="what">V přepravě</span></li>
      </ol>`,
    );
    expect(readTracking(html).status).toBe('v přepravě');
  });

  it('VeloCorriere maps Italian wording and ignores non consegnato as delivery', () => {
    const html = page(
      'velocorriere',
      `<ul class="vc-events"><li><span class="when">03/11/2026 08:00</span><span class="what">Non consegnato</span></li></ul>`,
    );
    expect(readTracking(html).status).toBe('v přepravě');
    const delivered = page(
      'velocorriere',
      `<ul class="vc-events"><li><span class="when">03/11/2026 08:00</span><span class="what">Consegnato</span></li></ul>`,
    );
    expect(readTracking(delivered).status).toBe('doručeno');
    const back = page(
      'velocorriere',
      `<ul class="vc-events"><li><span class="when">03/11/2026 08:00</span><span class="what">In restituzione al mittente</span></li></ul>`,
    );
    expect(readTracking(back).status).toBe('vrací se');
  });

  it('NordParcel badge wins unless history disagrees', () => {
    const html = page(
      'nordparcel',
      `<p class="np-badge">In transit</p><ul class="np-history"><li><span class="when">2026-11-03 08:00</span><span class="what">In transit</span></li></ul>`,
    );
    expect(readTracking(html).status).toBe('v přepravě');
    const conflict = page(
      'nordparcel',
      `<p class="np-badge">Delivered</p><ul class="np-history"><li><span class="when">2026-11-03 08:00</span><span class="what">In transit</span></li></ul>`,
    );
    const reading = readTracking(conflict);
    expect(reading.status).toBe('nevím');
    if (reading.status === 'nevím') expect(reading.cause).toBe('conflicting_events');
    const notDelivered = page('nordparcel', `<p class="np-badge">Not delivered</p>`);
    expect(readTracking(notDelivered).status).toBe('v přepravě');
    const returning = page('nordparcel', `<p class="np-badge">Returning to sender</p>`);
    expect(readTracking(returning).status).toBe('vrací se');
  });

  it('empty page, error page, and unknown carrier abstain', () => {
    expect(readTracking('   ').status).toBe('nevím');
    expect(readTracking('<html><body> </body></html>').status).toBe('nevím');
    const error = readTracking(
      `<html><body><div data-carrier="rychlopost" id="carrier-error">Provozní odstávka</div></body></html>`,
    );
    expect(error.status).toBe('nevím');
    if (error.status === 'nevím') expect(error.cause).toBe('error_page');
    const alien = readTracking(`<html><body><div data-carrier="postghost">x</div></body></html>`);
    expect(alien.status).toBe('nevím');
    if (alien.status === 'nevím') expect(alien.cause).toBe('unknown_carrier');
  });

  it('same newest timestamp with two statuses is a conflict', () => {
    const html = page(
      'rychlopost',
      `<table class="rp-events"><tbody>
        <tr><td class="when">03.11.2026 08:00</td><td class="what">Doručeno příjemci</td></tr>
        <tr><td class="when">03.11.2026 08:00</td><td class="what">V přepravě</td></tr>
      </tbody></table>`,
    );
    const reading = readTracking(html);
    expect(reading.status).toBe('nevím');
    if (reading.status === 'nevím') expect(reading.cause).toBe('conflicting_events');
  });
});
