---
description: Find video topics in a niche with the topic-scout sub-agent.
argument-hint: <niche and audience>
---

Find topics for the next video. Niche: $ARGUMENTS

If the niche is empty, ask the author: "Bạn muốn tìm chủ đề cho mảng nội dung nào? Đối tượng người xem là ai?" Then delegate to the `scene-flow:topic-scout` sub-agent with the niche and audience. Relay the ranked topics and ask the author to pick one.
