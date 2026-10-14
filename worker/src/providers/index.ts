import { providerRegistry } from './registry';
import { qqMusicProvider } from './qqmusic';
import { neteaseProvider } from './netease';
import { kugouProvider } from './kugou';
import { qishuiProvider } from './qishui';
import { kuwoProvider } from './kuwo';

// Register all supported music providers into centralized registry
providerRegistry.register(qqMusicProvider);
providerRegistry.register(neteaseProvider);
providerRegistry.register(kugouProvider);
providerRegistry.register(qishuiProvider);
providerRegistry.register(kuwoProvider);

export { providerRegistry };
export * from './registry';
export * from './platforms';
export * from './types';
