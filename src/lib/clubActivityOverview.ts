export type ActivityOverviewSubscription = {
  id: string;
  subscriptionName: string;
  typologyId: string;
};

export type ActivityOverviewArea = {
  id: string;
  name: string;
  readerNames: string[];
  subscriptions: ActivityOverviewSubscription[];
};
