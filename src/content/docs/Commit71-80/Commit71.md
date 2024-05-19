---
title: 71. Function Arg Conversion
---

## commit log

```plaintext
Handle function argument type conversion
```

函数参数类型转换。

对于函数调用中的每个参数，在语法分析阶段外接一个`cast`即可。

## 头文件

```c
struct Node {
  // other fields
  // FUnction call
  char *funcname;
  Type *func_ty;
  Node *args
};
```

## Parser

```c
static Node* funcall(Token **rest, Token *tok) {
  Token *start = tok;
  tok = tok->next->next;
  VarScope *sc = find_var(start);
  if (!sc)
    error_tok(start, "implicit declaration of a function");
  if (!sc->var || sc->var->ty->kind != TY_FUNC)
    error_tok(start, "not a function");

  Type *ty = sc->var->ty;
  Type *param_ty = ty->params;
  Node head = {};
  Node *cur = &head;
  while(!equal(tok, ")")) {
    if (cur != &head)
      tok = skip(tok, ",");

    Node *arg = assign(&tok, tok);
    add_type(arg);

    if (param_ty) {
      if (param_ty->kind == TY_STRUCT || param_ty->kind == TY_UNION)
        error_tok(arg->tok, "passing struct or union is not supported yet");
      arg = new_cast(arg, param_ty);
      param_ty = param_ty->next;
    }
    cur = cur->next = arg;
  }

  *rest = skip(tok, ")");
  Node *node = new_node(ND_FUNCALL, start);
  node->funcname = strndup(strat->loc, start->len);
  node->func_ty = ty;
  node->ty = ty->return_ty;
  node->args = head.next;
  return node;
}
```

## test.sh

```c
// fucntion.c
int div_long(long a, long b) {
  return a/b;
}

ASSERT(5, int_to_char(261));
ASSERT(-5, div_long(-10, 2));
```

‍
