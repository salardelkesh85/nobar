import { describe, it, expect, vi } from 'vitest';
import { IdentityClient } from '../src/identity-client';
const tokens = { accessToken: 'a', refreshToken: 'r', expiresIn: 60, user: { id: 'u' } };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status });
describe('identity client sessions', () => {
  it('calls fetch without binding the client as the browser receiver', async () => {
    const transport = async function (this: unknown) { expect(this).toBeUndefined(); return json({ expiresInSec: 120, resendInSec: 60 }); };
    const client = new IdentityClient('http://localhost:4000', transport);
    await expect(client.requestOtp('09121234567')).resolves.toMatchObject({ resendInSec: 60 });
  });
  it('shares refresh across concurrent unauthorized requests and retries with the new token', async () => {
    let refreshes=0;
    const transport=vi.fn<typeof fetch>(async (url, init) => {
      if(String(url).endsWith('/verify')) return json(tokens);
      if(String(url).endsWith('/refresh')) { refreshes++; await new Promise(r=>setTimeout(r,10)); return json({...tokens,accessToken:'b'}); }
      return new Headers(init?.headers).get('Authorization')==='Bearer b' ? json([]) : json({},401);
    });
    const client=new IdentityClient('http://localhost:4000',transport);
    await client.verify('09121234567','123456');
    await Promise.all([client.addresses(),client.addresses()]);
    expect(refreshes).toBe(1);
  });
  it('does not restore a session after logout while refresh is pending', async () => {
    let release!: (r: Response)=>void;
    const transport=vi.fn<typeof fetch>(async url => {
      if(String(url).endsWith('/verify')) return json(tokens);
      if(String(url).endsWith('/refresh')) return new Promise<Response>(r=>{release=r;});
      if(String(url).endsWith('/logout')) return new Response(null,{status:204});
      return json({},401);
    });
    const client=new IdentityClient('http://localhost:4000',transport);
    await client.verify('09121234567','123456');
    const request=client.me();
    const failed=expect(request).rejects.toMatchObject({status:401});
    await vi.waitFor(()=>expect(release).toBeDefined());
    await client.logout(); release(json({...tokens,accessToken:'b'}));
    await failed; expect(client.user).toBeNull();
  });
  it('does not retry forbidden requests', async()=>{
    const transport=vi.fn<typeof fetch>().mockResolvedValueOnce(json(tokens)).mockResolvedValueOnce(json({},403));
    const client=new IdentityClient('http://localhost:4000',transport);await client.verify('x','x');
    await expect(client.me()).rejects.toMatchObject({status:403});expect(transport).toHaveBeenCalledTimes(2);
  });
});
