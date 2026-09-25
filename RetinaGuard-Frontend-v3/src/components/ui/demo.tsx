import * as React from "react";
import { ResourceCardsGrid, ResourceCardItem } from "./resource-cards-grid";

// Sample data for the resource cards
const resourceData: ResourceCardItem[] = [
  {
    iconSrc: "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for SOPs
    title: "SOPs",
    lastUpdated: "29 April 2025",
    href: "#",
  },
  {
    iconSrc: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for Contracts
    title: "Contracts",
    lastUpdated: "29 April 2025",
    href: "#",
  },
  {
    iconSrc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for Templates
    title: "Templates",
    lastUpdated: "29 April 2025",
    href: "#",
  },
  {
    iconSrc: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for Policies
    title: "Policies",
    lastUpdated: "29 April 2025",
    href: "#",
  },
  {
    iconSrc: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for Knowledge Base
    title: "Knowledge Base",
    lastUpdated: "29 April 2025",
    href: "#",
  },
  {
    iconSrc: "https://images.unsplash.com/photo-1457276587196-a9d53d84c58b?w=320&q=75&auto=format&fit=crop", // Stock Unsplash image for Archive
    title: "Archive",
    lastUpdated: "29 April 2025",
    href: "#",
  },
];

export const ResourceGridDemo = () => {
  return (
    <div className="w-full max-w-6xl p-4 md:p-8">
      <ResourceCardsGrid items={resourceData} />
    </div>
  );
};

export default ResourceGridDemo;
