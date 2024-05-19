---
title: 63. Long Long Alias
---

## commit log

```plaintext
Add `long long` as an alias for `long`
```

（有点不太明白为什么这个这么简单居然被单独拿了出来。）

## Parser

```c
static Type *declspec(Token **rest, Token *tok) {
  // code
  switch(counter) {
    // other cases
  case LONG:
  case LONG + INT:
  case LONG + LONG:
  case LONG + LONG + INT:
    ty = ty_long; break;
  // ...
  }
}
```

## 测例

```c
// decl.c
int main() {
  ASSERT(8, ({ long long x; sizeof(x); }));
}
```

‍
