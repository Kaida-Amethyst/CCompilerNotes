---
title: 69. Undefined Function Errors
---

## commit log

```plaintext
Report an error on undefined/undeclared functions
```

当出现未定义或未声明的函数时，报错。

## Parser

修改parser中的`funcall`函数即可：

```c
static Node *funcall(Token **rest, Token *tok) {
  Token *start = tok;
  tok = tok->next->next;

  VarScope *sc = find_var(start);
  if (!sc)
    error_tok(start, "implicit declaration of a function");
  if (!sc->var || sc->var->ty->kind != TY_FUNC)
    error_tok(start, "not a function");

  Type *ty = sc->var->ty->return_ty;
  Node head = {};
  Node *cur = &head;

  while (!equal(tok, ")")) {
    if (cur != &head)
      tok = skip(tok, ",");
    cur = cur->next = assign(&tok, tok);
    add_type(cur);  // <----
  }

  *rest = skip(tok, ")");
  Node *node = new_node(ND_FUNCALL, start);
  node->funcname = strndup(start->loc, start->len);
  node->ty = ty;   // <----
  node->args = head.next;
  return node;
}
```

## Lexer

需要把`verror_at`中的exit去掉，让`error_at`和`error_tok`来进行这个`exit`的操作。

## 测例

在测例中需要添加`assert`函数的声明。

```c
// test.h
void assert(int expected, int actual, char *code);
```
