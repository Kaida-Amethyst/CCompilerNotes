---
title: 89. Resolve conflict between labels and typedefs
---

## commit log

```c
Resolve conflict between labels and typedefs.
```

解决标签与typedef的冲突问题。允许一个标识符可以既是标签，又是自定义的类型名称。

## Parser

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  // code
  while (!equal(tok, "}")) {
    if (is_typename(tok) && !equal(tok->next, ":")) {
      // ...
    }
    // ...
  }
}
```

## test

```c
// control.c
int main() {
  ASSERT(1, ({ typedef int foo; goto foo; foo:; 1; }));
}
```
