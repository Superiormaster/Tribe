const {
  viewabilityConfig,
  onViewableItemsChanged,
  isItemVisible,
} = useFeedViewability();
const {
  viewabilityConfig,
  onViewableItemsChanged,
  isItemVisible,
} = useFeedViewability();

<FlatList
  data={posts}
  viewabilityConfig={viewabilityConfig}
  onViewableItemsChanged={onViewableItemsChanged}
  renderItem={({ item }) => (
    <ReelCard
      post={item}
      isVisible={isItemVisible(item.id)}
    />
  )}
/>
<FlatList
  data={posts}
  keyExtractor={(item) =>
    String(item.id)
  }
  renderItem={({ item }) => (
    <PostCard
      post={item}
      isVisible={isItemVisible(item.id)}
    />
  )}
  onViewableItemsChanged={
    onViewableItemsChanged
  }
  viewabilityConfig={
    viewabilityConfig
/>

{isVideo && isVisible && (
  <VideoPlayer
    post={post}
  />
)}