---
title: 12. Return Statement
---

## Commit log

```plaintext
Add "return" statement
```

return，实际上就相当于一个跳转，就是从被调用函数内跳转到主函数内。

所谓的`return 1`，翻译成x86就相当于：

```x86asm
  mov $1, %rax
  jmp .L.return
.L.return:
  ...
```

## 思路

注意从这一个commit开始，我们开始涉及到C中的关键字的问题了。做法其实也很简单，对于像`return 1;`这样的语句，在AST中的一个作为一个node，它的左操作数就是`return`关键字，右操作数是一个表达式。我们先前所有的代码，对于表达式都是会放到`%rax`寄存器内的。因此在扫描到`return`关键字，处理这个左操作数的时候，就直接打印出`jmp .L.return`就好了。`return`后面的语句其实也可以正常生成。但是我们在最后codegen的时候，会在程序的尾部加上`.L.return`，这样`return`后面的语句其实是无效的。

## Chibicc.h

添加新的Token，以及新的节点类型。

```c
typedef enum {
  TK_IDENT,
  TK_PUNCT,
  TK_KEYWORD,    // <---
  TK_NUM,
  TK_EOF,
}

typedef enum {
  ND_LT,
  ND_LE,
  ND_ASSIGN,
  ND_RETURN,      // "return"
  ND_EXPR_STMT,
  ND_VAR,
  ND_NUM,
}
```

## lexer

需要让词法分析器可以识别出`return`关键字。这里的做法是，我们在整个词法分析结束后，扫描整个token链表，因为每个token我们都保留了字符串，所以对于每个token，我们看看它是不是`return`就好，如果是`return`，我们就将它的kind换成`TK_KEYWORD`。

```c
static void convert_keywords(Token *tok) {
  for (Token *t = tok; t->kind != TK_EOF; t = t->next)
    if (equal(t, "return"))
      t->kind = TK_KEYWORD;
}
```

上面的这个函数写好后，把它放在`tokenize`函数的最后即可。

```c
Token *tokenize(cgar *p) {
  /*  code  */
  convert_keywords(head.next);
  return head.next;
}
```

## Parser

一个`return`语句，应该是要被视为一个`stmtement`的，因此：

```c
static Node *stmt(Token **rest, Token *tok) {
  if (equal(tok, "return")) {
    Node *node = new_unary(ND_RETURN, expr(&tok, tok->next)); // 注意这里是unary
    *rest = skip(tok, ";");
    return node;
  }

  return expr_stmt(rest, tok);
}
```

实际上就相当于原有的范式变成了：

```plaintext
stmt : "return" expr ";"
     | expr ";" stmt
     |
     ;
```

## Codegen

codegen的部分，主要需要修改两处，一是对stmt的生成，还有就是最后codegen函数。

```c
static void gen_stmt(Node *node) {
  switch (node->kind) {
    case ND_RETURN:
      gen_expr(node->lhs);
      printf("  jmp .L.return\n");
      return;
    case ND_EXPR_STMT:
      gen_expr(node->lhs);
      return ;
    default:
      break;
  }
  error("invalid statement");
}

void codegen(Fucntion *prog) {
  /* code  */
  printf(".L.return:\n");
  printf("  mov %%rbp, %%rsp\n");
  printf("  pop %%rbp\n");
  printf("  ret\n");
}
```

## test.sh

理论上来说，原有的测例其实还是都能通过的。不过对于原有的测例，希望返回什么值，最好还是都加上`return`。

另外多加几个测例。

```bash
assert 1 'return 1; 2; 3;'
assert 2 '1; return 2; 3;'
assert 3 '1; 2; return 3;'
```

‍
