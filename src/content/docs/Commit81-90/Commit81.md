---
title: 81. Logical NOT
---

## commit log

```plaintext
Add ! operator
```

添加`!`操作符。

## Parser

修改parser，添加ND_NOT类型，在codegen阶段中对其进行代码生成即可。

```c
typedef enum {
  // ...
  ND_NOT,
} NodeKind;

static Node *unary(Token **rest, Token *tok) {
  if (equal(tok, "!")) {
    return new_unary(ND_NOT, cast(rest, tok->next), tok);
  }

  // other cases
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  case ND_NOT:
    node->ty = ty_int;
    return ;
  // other cases
  }
}
```

## codegen

```c
static void gen_expr(Node *node) {
  println("  .loc 1 %d", node->tok->line_no);
  switch(node->kind) {
  case ND_NOT:
    gen_expr(node->lhs);
    println("  cmp $0, %%rax");
    println("  sete %%al");
    println("  movzx %%al, %%rax");
    return ;
  }
}
```

## test

```c
// arith.c
int main() {
  ASSERT(0, !1);
  ASSERT(0, !2);
  ASSERT(1, !0);
  ASSERT(1, !(char)0);
  ASSERT(0, !(long)3);
  ASSERT(4, sizeof(!(char)0));   // 注意这两个例子
  ASSERT(4, sizeof(!(long)0));
}
```
