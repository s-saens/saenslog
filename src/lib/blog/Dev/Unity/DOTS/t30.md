---
title: 'ECS - Archetype'
date: 2023-07-11 13:44
tistory: https://saens.tistory.com/30
---

Archetype은 특정한 조합의 Components를 묶은 것을 말합니다. 가령 Component A, B, C가 있는 상황에는 다음과 같이 일곱 가지(진부분집합의 개수 = 2ᴺ - 1개)의 Archetype이 나올 수 있습니다.

`<A>, <B>, <C>, <A,B>, <B,C>, <A,C>, <A,B,C>`

어떤 Entity E가 A, B를 가지고 있다면 E는 3번 Archetype을 가진 셈입니다.

Archetype이라는 개념은 이게 전부입니다. 아주 간단하죠. 그런데 굳이 왜 이런 식으로 데이터를 저장하는 것일까요?

---

#### 1. Archetype과 Chunk

Archetype하나는 16KiB짜리 Chunk들로 이루어져 있습니다. 이 Chunk에는 그 조합의 **Component**들과, **Entity**에 대한 배열을 가지고 있습니다.

가령 다음과 같은 상황을 가정해봅시다.

- <A,B,C> 조합의 Archetype M을 가진 Entity가 12개.
- <B,C> 조합의 Archetype N을 가진 Entity가 6개.

그러면 다음과 같은 형태로 메모리에 저장됩니다.

![](/blog/Dev/Unity/t30/01_img.png)

Entity E13에 Component A를 추가하면, EntityManager에 의해 E13은 Archetype M으로 이동하고, 그 빈 자리는 해당 Chunk의 마지막 원소로 대체하여 아래 그림과 같아집니다.

![](/blog/Dev/Unity/t30/02_img.png)

위에서는 Entity와 그에 대응되는 Component에 대한 인덱스로 접근한다는 것의 이해를 돕기 위해 저렇게 한 줄에 컴포넌트 하나씩 그리고, 일정한 크기와 여백을 만들어서 그렸지만, 사실은, 애초에 2차원 형태로 저장되는 것도 아닐 뿐더러, 유니티 공식 문서의 표현을 빌리면 "Tightly"하게 저장되기 때문에 실제로는 저 그림보다는 아래 그림이 더 가까울 것입니다.

![](/blog/Dev/Unity/t30/03_img.png)

이런 식으로 데이터들을 관리함으로써 메모리를 객체지향에서보다 훨씬 효율적으로 활용할 수 있게 되는 것입니다. 그런데, Archetype을 사용하는 이점은 이 뿐만이 아닙니다.

#### 2. 빠른 Query

위에서와 같이 Component A, B, C가 있고, World에 총 10만 개의 Entity가 있는데 이 중 Component A를 가진 Entity는 만 개 뿐이라고 생각해 봅시다.

Component A를 가진 Entity를 찾기 위해서는 10만 개의 Entity를 다 돌면서 확인할 수도 있겠지만, 조합 별로 나눠 두었기 때문에 7개의 Archetype만 확인하면 됩니다. 10만 번 해야 할 일을 7번으로 끝낼 수 있는 것이죠.

Archetype의 개수가 Entity의 개수를 초과하면, 오히려 사이클이 증가할 수 있지 않는가? 라고 생각했지만, 생각해보니 그런 경우는 수학적으로 불가능하더라구요. 그리고 애초에 Archetype이 지나치게 많아진다면 데이터 설계를 잘못했거나, 프로젝트가 데이터 지향에는 어울리지 않을 가능성이 큽니다.

####

---

기본적으로 World의 EntityManager가 자동으로 Entity들의 Component를 검사하고, Archetype을 분류해 놓습니다. 또한 Component에 대한 Query도 내부적으로 Archetype을 가지고 처리되기 때문에 Archetype이 어떻게 이루어져있는지, 이걸 어떻게 관리해야 할 지에 대해서는 **깊게 생각하실 필요가 없습니다**. 서론에서 말씀 드린 대로 Archetype에 의한 Query를 작성할 때에나 그 원리 정도만 아시면 됩니다.
