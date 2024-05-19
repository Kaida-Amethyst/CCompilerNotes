---
title: 11. Multiple character variable
---

## Commit log

```shell
Support multi-letter local variables
```

前一个commit是仅仅支持单个字符的，现在我们要来支持一个字符串来作为变量名。

当然如果仅仅是想要达到这个目标的话，可能就过于简单了，无非是把之前的`char`改成`char*`。但我们这一次要来重新审视我们的代码。我们实际上是写了一个函数，这个函数有函数体，就是那些statements。然后有局部变量，我们可能需要去计算我们到底用了多少局部变量，来决定我们需要多少的栈空间。

## 思路

我们把所有用到的局部变量用一个链表来存储，用三个字段，第一是名称，第二是所在的栈位置，第三就是下一个局部变量：

```c
typedef struct Obj Obj;
struct Obj {
  Obj *next;
  char *name;
  int offset;
};
```

然后我们来设计函数，实际上我们这里还只有一个函数，但是为了后续分析的便利，函数的概念在这里就要引入。我们的函数有三个字段，第一个是AST树，就是我们所有statements的集合。第二个是局部变量链表。第三个是栈空间。

```c
typedef struct Function Function;
struct Function {
  Node *body;
  Obj *locals;
  int stack_size;
};
```

## Chibicc.h

修改一下`struct Node`：

```c
struct Node {
  NodeKind kind;
  Node *next;
  Node *lhs;
  Node *rhs;
  Obj *var;       // <----- if kind == ND_VAR
  int val;
};
```

然后把`parse`和`codegen`修改一下，让`parse`返回一个`Function`，然后让`codegen`去接收一个`Function`。

```c
Function *parse(Token *tok);
void codegen(Function *prog);
```

## Lexer

现在要支持多个字符了，那么变量名的规则是，必须是以字母或者下划线开头，伴随则字母，下划线，和数字，我们写两个函数在这里：

```c
static bool is_ident1(char c) {
  return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c == '_';
}

// Returns true if c is valid as a non-first character of an identifier.
static bool is_ident2(char c) {
  return is_ident1(c) || ('0' <= c && c <= '9');
}
```

这个函数在tokenize这个函数中用到：

```c
Token *tokenize(char *p) {
  /*  code  */
  while(*p) {
    /*  code  */
    if (is_ident1(*p)) {
      char *start = p;
      do {
        p++;
      } while(is_ident2(*p));
      cur = cur->next = new_token(TK_IDENT, start, p);
      continue;
    }
    /*  code  */
  }
  /*  code  */
}
```

## Parser

首先修改一下`new_var_node`

```c
static Node *new_var_node(Obj *var) {
  Node *node = new_node(ND_VAR);
  node->var = var;
  return node;
}
```

然后要新添加一个`new_lvar`，这个与上面的函数的区别在于，对于`a=b`这样的表达式来说，当扫描到`a`的时候，要调用`new_lvar`，在这里，我们要初始化一个`Obj`。但对于`b`来说，我们是默认已经有了这个`Obj`的，因此要调用上面的函数。

```c
Obj *locals;  // 暂时这里是一个全局变量，因为我们实际上是只有一个函数的

static Obj *new_lvar(char *name) {
  Obj *var = calloc(1, sizeof(Obj));
  var->name = name;
  var->next = locals;
  locals = var;
}
```

上面的locals，用来保存一个函数中的所有局部变量。在当下，我们还只有一个函数，因此先暂时将其设定为一个全局变量。

然后我们添加一个判断函数，用来看当给定一个变量名时，是否存在这样的局部变量。

```c
static Obj *find_var(Token *tok) {
  for(Obj *var = locals; var; var = var->next) {
    if (strlen(var->name) == tok->len && !strncmp(tok->loc, var->name, tok->len))
      return var;
  }
  return NULL;
}
```

然后在`primary`函数中，添加判断：

```c
static Node *primary(Token **rest, Token *tok) {
  /*  code  */
  if (tok->kind == TK_IDENT) {
    Obj *var = find_var(tok);
    if (!var) {
      var = new_lvar(strndup(tok->loc, tok->len));
    *rest = tok->next;
    return new_var_node(var);
    }
  }
  /*  code  */
}
```

这实际上就是说，对于`a=b`这样的表达式来说，不管`a`和`b`在先前有没有被声明出来，在这里都会有对应的Node。

实际上这里会存在一定的问题，就是说，如果一个变量没有被声明出来就使用的话，譬如对于这个表达式：`a=2;b;`，实际上最后是可以顺利生成代码的。

最后修改一下parse函数：

```c
Function *parse(Token *tok) {
  Node head = {}; 
  Node *cur = &head;

  while (tok->kind != TK_EOF)
    cur = cur->next = stmt(&tok, tok);

  Function *prog = calloc(1, sizeof(Function));  
  prog->body = head.next;
  prog->locals = locals;
  return prog;
}

```

## CodeGen

到了codegen这个阶段之后，我们就已经知道了我们声明了多少个局部变量，首先我们需要做的事情是，我们要确定分配多少内存，以及每个局部变量的offset。由于局部变量在这里就是用一个链表来表示的，因此，我们就直接用变量所处链表的位置，来直接定它的offset。

```c
// Assign offsets to local variables.
static void assign_lvar_offsets(Function *prog) {
  int offset = 0;
  for (Obj *var = prog->locals; var; var = var->next) {
    offset += 8;
    var->offset = -offset;
  }
  prog->stack_size = align_to(offset, 16);
}
```

注意这里用了一个`align_to`函数，它的作用是把用到的栈空间，扩充成16的倍数，假定我们使用了40字节的栈空间，这个函数会将其扩充为48字节。

```c
static int align_to(int n, int align) {
  return (n + align - 1) / align * align;
}
```

然后就好办了，对于`gen_addr`来说，修改成如下：

```c
static void gen_addr(Node *node) {
  if (node->kind == ND_VAR) {
    printf("  lea %d(%%rbp), %%rax\n", node->var->offset);
    return;
  }

  error("not an lvalue");
}
```

然后修改一下`codegen`函数：

```c
void codegen(Function *prog) {
  assign_lvar_offsets(prog);

  printf("  .globl main\n");
  printf("main:\n");

  // Prologue
  printf("  push %%rbp\n");
  printf("  mov %%rsp, %%rbp\n");
  printf("  sub $%d, %%rsp\n", prog->stack_size);   // <---

  for (Node *n = prog->body; n; n = n->next) {
    gen_stmt(n);
    assert(depth == 0);
  }

  printf("  mov %%rbp, %%rsp\n");
  printf("  pop %%rbp\n");
  printf("  ret\n");
}

```

这样就完成了。

# test.sh

```bash
assert 3 'foo=3; foo;'
assert 8 'foo123=3; bar=5; foo123+bar;'
```

‍
