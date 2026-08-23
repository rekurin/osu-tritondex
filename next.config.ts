import type { NextConfig } from 'next';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true';
const isUserOrOrganizationSite = repositoryName.toLowerCase().endsWith('.github.io');
const basePath = isGitHubPagesBuild && repositoryName && !isUserOrOrganizationSite ? `/${repositoryName}` : '';

const nextConfig: NextConfig = {
  output: isGitHubPagesBuild ? 'export' : undefined,
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
