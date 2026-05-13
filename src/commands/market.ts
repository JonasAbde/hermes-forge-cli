import { Command } from 'commander';
import chalk from 'chalk';
import { ForgeApiClient } from '../lib/forgeApiClient.js';
import { printHeader, printSuccess, printError, printInfo } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import Table from 'cli-table3';

// ─── Local types for market-specific data ──────────────────────────

interface MarketPack {
  pack_id: string;
  name: string;
  slug?: string;
  rarity_label?: string;
  price?: number | string;
  category?: string;
  description?: string;
  status?: string;
  seller_id?: string;
  listed_at?: string;
}

interface MarketStatus {
  wallet?: {
    balance: number;
    currency: string;
  };
  balance?: number;
  currency?: string;
  listed_count?: number;
  sold_count?: number;
  total_earnings?: number;
  pending_transactions?: number;
  [key: string]: unknown;
}

interface MarketBuyResponse {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

interface MarketSellResponse {
  success: boolean;
  listing_id?: string;
  error?: string;
}

// ─── API helper for endpoints not yet on ForgeApiClient ────────────

function getApiConfig() {
  const cfg = config.get();
  const baseUrl = (cfg.remote?.baseUrl || 'https://forge.tekup.dk/api/forge/v1').replace(/\/+$/, '');
  const apiKey = cfg.remote?.apiKey;
  return { baseUrl, apiKey };
}

function getHeaders(): Record<string, string> {
  const { apiKey } = getApiConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<{ data: T; status: number }> {
  const { baseUrl } = getApiConfig();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  return { data, status: res.status };
}

function handleApiError(err: unknown, label?: string): void {
  const prefix = label ? `${label}: ` : '';
  if (err instanceof TypeError && err.message === 'fetch failed') {
    printError(`${prefix}Cannot reach Forge API. Check your network or server status.`);
  } else if (err instanceof Error) {
    printError(`${prefix}${err.message}`);
  } else {
    printError(`${prefix}${String(err)}`);
  }
}

// ─── Table builder ─────────────────────────────────────────────────

function printMarketPacksTable(packs: MarketPack[]): void {
  if (packs.length === 0) {
    printInfo('No packs found.');
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Name'),
      chalk.bold('Rarity'),
      chalk.bold('Price'),
      chalk.bold('Category'),
    ],
    colWidths: [32, 14, 14, 22],
    style: { head: ['cyan'] },
  });

  for (const p of packs) {
    const name = p.name || p.slug || p.pack_id?.slice(0, 8) || 'Unknown';
    const rarity = p.rarity_label || '-';
    const price =
      p.price != null
        ? chalk.green(String(p.price))
        : chalk.gray('—');
    const category = p.category || '-';
    table.push([name, rarity, price, category]);
  }

  console.log(table.toString());
}

// ─── Subcommands ───────────────────────────────────────────────────

const listCmd = new Command('list')
  .description('List all packs available on the marketplace')
  .option('--json', 'output as JSON')
  .action(async (opts: { json?: boolean }) => {
    const cfg = config.get();
    const client = new ForgeApiClient({
      baseUrl: cfg.remote?.baseUrl,
      apiKey: cfg.remote?.apiKey,
    });

    try {
      const packs = await client.listPacks();

      if (opts.json) {
        console.log(JSON.stringify(packs, null, 2));
        return;
      }

      printHeader(`Market Packs (${packs.length})`);
      printMarketPacksTable(packs as MarketPack[]);
    } catch (err) {
      handleApiError(err, 'Failed to list packs');
    }
  });

const searchCmd = new Command('search')
  .description('Search marketplace packs by name or description')
  .argument('<query>', 'search term')
  .option('--json', 'output as JSON')
  .action(async (query: string, opts: { json?: boolean }) => {
    const cfg = config.get();
    const client = new ForgeApiClient({
      baseUrl: cfg.remote?.baseUrl,
      apiKey: cfg.remote?.apiKey,
    });

    try {
      const allPacks = await client.listPacks();
      const lower = query.toLowerCase();
      const results = allPacks.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(lower);
        const descMatch = (p as MarketPack).description?.toLowerCase().includes(lower);
        const slugMatch = p.slug?.toLowerCase().includes(lower);
        const categoryMatch = (p as MarketPack).category?.toLowerCase().includes(lower);
        return nameMatch || descMatch || slugMatch || categoryMatch;
      });

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      printHeader(`Search Results for "${query}" (${results.length})`);
      printMarketPacksTable(results as MarketPack[]);
    } catch (err) {
      handleApiError(err, 'Failed to search packs');
    }
  });

const buyCmd = new Command('buy')
  .description('Purchase a pack from the marketplace')
  .argument('<pack-id>', 'ID of the pack to buy')
  .option('--json', 'output as JSON')
  .action(async (packId: string, opts: { json?: boolean }) => {
    try {
      printInfo(`Purchasing pack ${chalk.cyan(packId)}...`);
      const { data } = await apiFetch<MarketBuyResponse>('POST', '/market/buy', {
        pack_id: packId,
      });

      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      if (data.success) {
        printSuccess(`Pack purchased successfully!`);
        if (data.transaction_id) {
          console.log(`  Transaction ID: ${chalk.cyan(data.transaction_id)}`);
        }
      } else {
        printError(data.error || 'Purchase failed');
      }
    } catch (err) {
      handleApiError(err, 'Buy failed');
    }
  });

const sellCmd = new Command('sell')
  .description('List a pack for sale on the marketplace')
  .argument('<pack-id>', 'ID of the pack to sell')
  .argument('[price]', 'Sale price (default: 0 / free)', '0')
  .option('--json', 'output as JSON')
  .action(async (packId: string, price: string, opts: { json?: boolean }) => {
    try {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        printError('Price must be a non-negative number.');
        if (opts.json) {
          console.log(JSON.stringify({ success: false, error: 'Invalid price' }));
        }
        return;
      }

      printInfo(`Listing pack ${chalk.cyan(packId)} for ${chalk.green(String(numericPrice))}...`);
      const { data } = await apiFetch<MarketSellResponse>('POST', '/market/sell', {
        pack_id: packId,
        price: numericPrice,
      });

      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      if (data.success) {
        printSuccess(`Pack listed for sale!`);
        if (data.listing_id) {
          console.log(`  Listing ID: ${chalk.cyan(data.listing_id)}`);
        }
      } else {
        printError(data.error || 'Listing failed');
      }
    } catch (err) {
      handleApiError(err, 'Sell failed');
    }
  });

const statusCmd = new Command('status')
  .description('Show marketplace wallet, balance, and stats')
  .option('--json', 'output as JSON')
  .action(async (opts: { json?: boolean }) => {
    try {
      const { data } = await apiFetch<MarketStatus>('GET', '/market/status');

      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      printHeader('Marketplace Status');

      // Wallet / Balance
      const balance = data.wallet?.balance ?? data.balance;
      const currency = data.wallet?.currency ?? data.currency ?? 'FORGE';
      if (balance != null) {
        console.log(`  ${chalk.bold('Balance:')}     ${chalk.green(String(balance))} ${currency}`);
      } else {
        console.log(`  ${chalk.bold('Balance:')}     ${chalk.gray('N/A')}`);
      }

      // Stats
      const stats: { label: string; value: string }[] = [];
      if (data.listed_count != null) {
        stats.push({ label: 'Listed', value: String(data.listed_count) });
      }
      if (data.sold_count != null) {
        stats.push({ label: 'Sold', value: String(data.sold_count) });
      }
      if (data.total_earnings != null) {
        stats.push({ label: 'Earnings', value: String(data.total_earnings) });
      }
      if (data.pending_transactions != null) {
        stats.push({ label: 'Pending', value: String(data.pending_transactions) });
      }

      if (stats.length > 0) {
        console.log(`  ${chalk.bold('Stats:')}`);
        for (const s of stats) {
          console.log(`    ${s.label}: ${chalk.cyan(s.value)}`);
        }
      }

      // Show any extra keys not explicitly handled
      const handledKeys = new Set([
        'wallet', 'balance', 'currency',
        'listed_count', 'sold_count', 'total_earnings', 'pending_transactions',
      ]);
      for (const [key, value] of Object.entries(data)) {
        if (!handledKeys.has(key) && typeof value !== 'object') {
          console.log(`  ${chalk.bold(key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}: ${String(value)}`);
        }
      }
    } catch (err) {
      handleApiError(err, 'Failed to fetch market status');
    }
  });

// ─── Root command ──────────────────────────────────────────────────

const p = new Command('market')
  .description('Interact with the Forge marketplace — list, search, buy, sell, and check status');

p.addCommand(listCmd);
p.addCommand(searchCmd);
p.addCommand(buyCmd);
p.addCommand(sellCmd);
p.addCommand(statusCmd);

export default p;
