---
title: 39. Statement Expression
---

## commit log

```plaintext
[GNU] Add statement expression

This is a GNU C extension but will be useful for writing tests.
```

statement expression这个语法比较妖，比较少见，它指的是用`({`和`})`括起来的一堆语句，然后一堆语句整体作为一个表达式有一个值，可以用来向外赋值。例如：

```c
int x = 30;
x = ({int p = x; p *= 20; p;});
printf("%d\n", x);  // 600
```

这种语法似乎是GNU C的一个扩展，我能想到的应用场景可能也就是用来替代一些简单的函数。不过既然chibicc实现了这个，那么还是来实现一下。

## 头文件

NodeKind里面添加新的类型：

```c
typedef enum {
  /*  other kind  */
  ND_STMT_EXPR,
  /*  other kind  */
} NodeKind;
```

## Parser

我们先来添加语法分析，注意它本身应当被识别为一个primary。

```c
static Node *primary(Toekn **rest, Token *tok) {
  if (equal(tok, "(") && equal(tok->next, "{")) {
    // This is a GNU statement expression
    Node *node = new_node(ND_STMT_EXPR, tok);
    node->body = compound_stmt(&tok, tok->next->next)->body;
    *rest = skip(tok, ")");
    return node;
  }
  /*  other code  */
}
```

## type.c

注意它本身是一个表达式，因此有类型，它的类型就是它最后一个语句的类型。所以注意这里要求它的最后一个语句必须是一个表达式。

```c
void add_type(Node *node) {
  /*  other code  */
  switch(node->kind) {
  /*  other cases  */
  case ND_STMT_EXPR:
    if (node->body) {
      Node *stmt = node->body;
      while(stmt->next)
        stmt = stmt->next;
      if (stmt->kind == ND_EXPR_STMT){
        node->ty = stmt->lhs->ty;
        return;
      }
    }
    error_tok(node->tok, "statement expression returing void is not supported");
    return ;
  }
}
```

## Codegen

最后是代码生成，与常规的block的代码生成一致就好。

```c
static void gen_expr(Node* node) {
  switch(node->kind) {
  /*  other kind  */
  case ND_STMT_EXPR:
    for(Node* n = node->body; n; n = n->next)
      gen_stmt(n);
    return ;
  }
}
```

## test.sh

最后添加几个测例：

```bash
assert 0 'int main() { return ({ 0; }); }'
assert 2 'int main() { return ({ 0; 1; 2; }); }'
assert 1 'int main() { ({ 0; return 1; 2; }); return 3; }'
assert 6 'int main() { return ({ 1; }) + ({ 2; }) + ({ 3; }); }'
assert 3 'int main() { return ({ int x=3; x; }); }'
```

‍
